#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""RouteAI fiyat doğrulama zamanlayıcısı (yalnızca Python standart kütüphanesi, Python 3.8+).

Proje içindeki npm komutlarını sırayla çalıştırır ve her koşuda şunları yapar:

  1. data/products.json'ı yedekler (logs/price-check/backup/)
  2. npm run check:prices  (fiyat sayfalarını okur, kanıtı doğrulanan fiyatları yazar)
  3. npm run validate:catalog  (katalog bozulduysa yedeği GERİ YÜKLER)
  4. özet yazar (logs/price-check/latest.md) ve istersen bildirim gönderir (e-posta / webhook)

Bu betik git push, deploy ya da canlı veritabanı işlemi YAPMAZ; sadece yerel data/products.json'ı
günceller. Sitede görünmesi için normal yayın akışını sen çalıştırırsın.

Komutlar:
  python scripts/price_scheduler.py run              # bir kez çalıştır
  python scripts/price_scheduler.py run --dry-run    # hiçbir dosyayı değiştirmeden dene
  python scripts/price_scheduler.py run --if-due 7   # son başarılı koşudan 7 gün geçmediyse atla
  python scripts/price_scheduler.py loop --every-days 7   # pencere açık kaldıkça sürekli çalışır
  python scripts/price_scheduler.py install --every-days 7 --at 09:00   # Windows zamanlanmış görev
  python scripts/price_scheduler.py uninstall
  python scripts/price_scheduler.py status
  python scripts/price_scheduler.py restore          # son yedeği geri yükle
  python scripts/price_scheduler.py notify-test      # bildirim ayarlarını dene

Bildirim ayarları (ortam değişkeni ya da .env.local içinde; sadece PRICE_NOTIFY_ ile başlayanlar okunur):
  PRICE_NOTIFY_WHEN=auto|always|failed|never     (varsayılan auto: sorun, inceleme ya da fiyat değişikliği varsa)
  PRICE_NOTIFY_WEBHOOK=https://ntfy.sh/konu-adin  (düz metin POST; Slack/Discord için PRICE_NOTIFY_WEBHOOK_FORMAT=json)
  PRICE_NOTIFY_SMTP_HOST, PRICE_NOTIFY_SMTP_PORT (587), PRICE_NOTIFY_SMTP_USER, PRICE_NOTIFY_SMTP_PASS,
  PRICE_NOTIFY_MAIL_FROM, PRICE_NOTIFY_MAIL_TO

OPENAI_API_KEY'in DEĞERİNE bu betik bakmaz, kaydetmez, yazdırmaz (sadece "tanımlı mı?" diye bakar);
check:prices anahtarı kendisi .env.local'dan alır.
Çıkış kodu: 0 = tamam/dikkat/atlandı, 1 = koşu başarısız (geri alındı ya da çöktü), 2 = ayar/kullanım hatası.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import shutil
import smtplib
import ssl
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timedelta
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

TASK_NAME = "RouteAI-PriceCheck"
LOG_DIR = Path("logs") / "price-check"
BACKUP_KEEP = 20
LOG_KEEP = 30
# Bu süreleri aşan komut öldürülür (saniye). Testlerde ortam değişkeniyle kısaltılabilir.
CHECK_TIMEOUT_S = int(os.environ.get("PRICE_CHECK_TIMEOUT_S", 45 * 60))
VALIDATE_TIMEOUT_S = int(os.environ.get("PRICE_VALIDATE_TIMEOUT_S", 10 * 60))
TEST_TIMEOUT_S = int(os.environ.get("PRICE_TEST_TIMEOUT_S", 15 * 60))
LOCK_STALE_S = 2 * 60 * 60

SUMMARY_RE = re.compile(
    r"değişti (\d+), teyit (\d+), inceleme (\d+), emin değil (\d+), hata (\d+), "
    r"pricingUrl yok (\d+), atlandı \(taze\) (\d+)\. Doğrulanmış: (\d+)/(\d+)"
)
ROW_RE = re.compile(
    r"^\[check-prices\] (\d+)\. (.+?): (HATA|emin değil|İNCELEME|DEĞİŞTİ|teyit|pricingUrl yok)(?: \((.*)\))?\s*$"
)


# --- küçük yardımcılar ---------------------------------------------------------------------


def now() -> datetime:
    return datetime.now()


def say(message: str = "") -> None:
    """Konsola yazar; kodlama hatası (Windows cp1254 vb.) betiği düşürmesin."""
    try:
        print(message, flush=True)
    except UnicodeEncodeError:
        print(message.encode("ascii", "replace").decode("ascii"), flush=True)


def project_root(arg: Optional[str]) -> Path:
    return Path(arg).resolve() if arg else Path(__file__).resolve().parent.parent


def check_project(project: Path) -> Optional[str]:
    if not (project / "package.json").is_file() or not (project / "data" / "products.json").is_file():
        return f"Bu klasör RouteAI projesi gibi görünmüyor: {project} (package.json ve data/products.json olmalı). --project ile göster."
    return None


def find_npm() -> Optional[str]:
    override = os.environ.get("PRICE_NPM")
    if override:
        return override
    return shutil.which("npm") or (shutil.which("npm.cmd") if os.name == "nt" else None)


def read_env_file(path: Path, prefix: Optional[str] = None) -> Dict[str, str]:
    """KEY=VALUE satırlarını okur (CRLF, tırnak ve yorum desteklenir). prefix verilirse yalnızca o öneki taşıyanlar döner."""
    values: Dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError:
        return values
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if prefix and not key.startswith(prefix):
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key] = value
    return values


def has_openai_key(project: Path) -> bool:
    """Anahtar var mı? Değerine bakılmaz, kaydedilmez, yazdırılmaz."""
    if os.environ.get("OPENAI_API_KEY", "").strip():
        return True
    env_file = project / ".env.local"
    try:
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            if re.match(r"^\s*OPENAI_API_KEY\s*=\s*[\"']?\S", line):
                return True
    except OSError:
        pass
    return False


def load_notify_config(project: Path) -> Dict[str, str]:
    config = read_env_file(project / ".env.local", prefix="PRICE_NOTIFY_")
    config.update({k: v for k, v in os.environ.items() if k.startswith("PRICE_NOTIFY_") and v.strip()})
    return config


def run_cmd(cmd: List[str], cwd: Path, timeout: int) -> Tuple[Optional[int], str]:
    """Komutu çalıştırır. Dönüş: (çıkış kodu | None=zaman aşımı, birleşik çıktı)."""
    env = dict(os.environ, NO_COLOR="1", FORCE_COLOR="0", PYTHONIOENCODING="utf-8")
    try:
        done = subprocess.run(
            cmd,
            cwd=str(cwd),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
        )
        return done.returncode, done.stdout or ""
    except subprocess.TimeoutExpired as exc:
        partial = exc.stdout.decode("utf-8", "replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        return None, partial
    except OSError as exc:
        return 127, f"Komut başlatılamadı: {exc}"


# --- durum, kilit, yedek ------------------------------------------------------------------------


def load_state(logdir: Path) -> Dict[str, Any]:
    try:
        return json.loads((logdir / "state.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_state(logdir: Path, state: Dict[str, Any]) -> None:
    (logdir / "state.json").write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_dt(value: Optional[str]) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(value) if value else None
    except ValueError:
        return None


def acquire_lock(logdir: Path) -> bool:
    lock = logdir / "run.lock"
    try:
        if lock.exists() and time.time() - lock.stat().st_mtime > LOCK_STALE_S:
            lock.unlink()  # takılı kalmış eski kilit
        fd = os.open(str(lock), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    with os.fdopen(fd, "w") as handle:
        handle.write(f"{os.getpid()} {now().isoformat()}")
    return True


def release_lock(logdir: Path) -> None:
    try:
        (logdir / "run.lock").unlink()
    except OSError:
        pass


def prune(directory: Path, pattern: str, keep: int) -> None:
    files = sorted(directory.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in files[keep:]:
        try:
            old.unlink()
        except OSError:
            pass


def backup_products(project: Path, logdir: Path, stamp: str) -> Path:
    folder = logdir / "backup"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"products-{stamp}.json"
    shutil.copy2(project / "data" / "products.json", target)
    prune(folder, "products-*.json", BACKUP_KEEP)
    return target


def restore_products(project: Path, backup: Path) -> None:
    shutil.copy2(backup, project / "data" / "products.json")


# --- çıktı ayrıştırma ----------------------------------------------------------------------------


def parse_check_output(output: str) -> Dict[str, Any]:
    """check:prices çıktısından sayıları ve ürün satırlarını çıkarır."""
    counts: Optional[Dict[str, int]] = None
    match = SUMMARY_RE.search(output)
    if match:
        keys = ["changed", "same", "review", "unknown", "error", "no_url", "fresh", "verified", "active"]
        counts = dict(zip(keys, (int(g) for g in match.groups())))
    rows = []
    for line in output.splitlines():
        row = ROW_RE.match(line.strip())
        if row:
            rows.append({"name": row.group(2), "label": row.group(3), "note": row.group(4) or ""})
    reasons = []
    for line in output.splitlines():
        text = line.strip()
        if not text.startswith("[check-prices] ") or ROW_RE.match(text) or "başladı:" in text or "elle alınan sayfa" in text:
            continue
        message = text[len("[check-prices] "):]
        if message.endswith(".") and not message.startswith("değişti "):
            reasons.append(message)
    return {"counts": counts, "rows": rows, "reasons": reasons}


def parse_report(text: str) -> Dict[str, List[str]]:
    """data/price-report.md bölümlerini {başlık: [madde, ...]} olarak verir (başlıktaki (N) atılır)."""
    sections: Dict[str, List[str]] = {}
    for block in re.split(r"^## ", text, flags=re.M)[1:]:
        title, _, body = block.partition("\n")
        title = re.sub(r"\s*\(\d+\)\s*$", "", title).strip()
        sections[title] = [ln[2:].strip() for ln in body.splitlines() if ln.startswith("- ") and ln.strip() != "- yok"]
    return sections


def extract_report_from_stdout(output: str) -> str:
    start = output.find("# Fiyat raporu")
    if start == -1:
        return ""
    end = output.find("[check-prices] değişti", start)
    return output[start:end if end != -1 else len(output)]


def load_products(path: Path) -> List[Dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def diff_prices(before: List[Dict[str, Any]], after: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Model ya da tutarı değişen ürünler (yalnızca tarih tazelenenler dahil değil)."""
    old = {p["id"]: p for p in before}
    changes = []
    for product in after:
        prev = old.get(product["id"])
        if not prev:
            continue
        a, b = prev.get("pricing") or {}, product.get("pricing") or {}
        if (a.get("model"), a.get("startingPrice")) != (b.get("model"), b.get("startingPrice")):
            changes.append(
                {
                    "id": product["id"],
                    "name": product.get("name", product["id"]),
                    "old": f"{a.get('model')} {a.get('startingPrice') if a.get('startingPrice') is not None else '—'}",
                    "new": f"{b.get('model')} {b.get('startingPrice') if b.get('startingPrice') is not None else '—'}",
                    "date": b.get("priceCheckedAt"),
                }
            )
    return changes


# --- özet ve bildirim ------------------------------------------------------------------------------


def build_summary(info: Dict[str, Any]) -> Tuple[str, str]:
    """(başlık, markdown gövde). info alanları run_once içinde doldurulur."""
    status = info["status"]
    label = {"ok": "TAMAM", "attention": "DİKKAT", "failed": "BAŞARISIZ"}[status]
    counts = info.get("counts")
    bits = []
    if info.get("changes"):
        bits.append(f"{len(info['changes'])} fiyat değişti")
    if counts:
        bits.append(f"doğrulanmış {counts['verified']}/{counts['active']}")
    if info.get("headline"):
        bits.append(info["headline"])
    title = f"[RouteAI fiyat] {label}" + (" — " + ", ".join(bits) if bits else "")

    lines = [f"# Fiyat doğrulama özeti — {info['when']:%Y-%m-%d %H:%M}", "", f"**Sonuç: {label}**" + (" (deneme koşusu, hiçbir dosya değişmedi)" if info.get("dry_run") else "")]
    if info.get("headline"):
        lines += ["", info["headline"]]
    if counts:
        lines += [
            "",
            f"Değişti {counts['changed']}, teyit {counts['same']}, inceleme {counts['review']}, emin değil {counts['unknown']}, "
            f"hata {counts['error']}, pricingUrl yok {counts['no_url']}, atlandı (taze) {counts['fresh']}. "
            f"Doğrulanmış (son 60 gün): {counts['verified']}/{counts['active']}.",
        ]
    for reason in info.get("reasons", []):
        lines.append(f"- {reason}")

    if info.get("changes"):
        lines += ["", f"## Yazılan fiyat değişiklikleri ({len(info['changes'])})", ""]
        for change in info["changes"]:
            lines.append(f"- {change['name']} (`{change['id']}`): {change['old']} → {change['new']} USD" + (f" — kanıt: {change['evidence']}" if change.get("evidence") else ""))

    if info.get("proposed"):
        lines += ["", f"## Yazılacak olan değişiklikler ({len(info['proposed'])}) — deneme koşusu, yazılmadı", ""] + [f"- {name}" for name in info["proposed"]]

    review = info.get("review", [])
    expiring = info.get("expiring", [])
    todo = []
    if review:
        todo += ["", f"## İncelemen gerekenler ({len(review)}) — products.json'a yazılmadı", ""] + [f"- {item}" for item in review]
    if expiring:
        todo += ["", f"## Doğrulaması 14 gün içinde bitecekler ({len(expiring)})", ""] + [f"- {item}" for item in expiring]
    manual = info.get("manual", [])
    if manual:
        todo += ["", f"## Betiğin okuyamadıkları ({len(manual)}) — sayfa bot engeli veriyor ya da JS ile çiziliyor", ""] + [f"- {item}" for item in manual[:25]]
    if todo:
        lines += todo
        lines += ["", "### Elle yapılacaklar", "", "```", "npm run price:snap -- --guided", "npm run check:prices -- --dry-run", "```"]
    if info.get("backup"):
        lines += ["", f"Yedek: {info['backup']}"]
    if info.get("log_file"):
        lines += [f"Ayrıntılı çıktı: {info['log_file']}"]
    return title, "\n".join(lines) + "\n"


def should_notify(when: str, status: str, changed: bool) -> bool:
    when = (when or "auto").lower()
    if when == "never":
        return False
    if when == "always":
        return True
    if when == "failed":
        return status == "failed"
    return status != "ok" or changed


def send_webhook(url: str, title: str, body: str, fmt: str = "text") -> None:
    text = (title + "\n\n" + body)[:1800]
    if fmt == "json":
        data = json.dumps({"text": text, "content": text}).encode("utf-8")
        headers = {"Content-Type": "application/json"}
    else:
        data = text.encode("utf-8")
        headers = {"Content-Type": "text/plain; charset=utf-8", "Title": "RouteAI price check"}
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=20) as response:  # noqa: S310 (kullanıcının kendi adresi)
        response.read()


def send_mail(config: Dict[str, str], title: str, body: str) -> None:
    host = config["PRICE_NOTIFY_SMTP_HOST"]
    port = int(config.get("PRICE_NOTIFY_SMTP_PORT", "587"))
    message = EmailMessage()
    message["Subject"] = title
    message["From"] = config.get("PRICE_NOTIFY_MAIL_FROM") or config.get("PRICE_NOTIFY_SMTP_USER", "")
    message["To"] = config["PRICE_NOTIFY_MAIL_TO"]
    message.set_content(body)
    if port == 465:
        smtp: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=30, context=ssl.create_default_context())
    else:
        smtp = smtplib.SMTP(host, port, timeout=30)
        smtp.starttls(context=ssl.create_default_context())
    try:
        user = config.get("PRICE_NOTIFY_SMTP_USER")
        if user:
            smtp.login(user, config.get("PRICE_NOTIFY_SMTP_PASS", ""))
        smtp.send_message(message)
    finally:
        smtp.quit()


def notify(config: Dict[str, str], title: str, body: str, log) -> None:
    """Ayarlı kanallara gönderir. Hata betiği düşürmez, sadece yazılır; parola/URL gizli tutulur."""
    sent = False
    if config.get("PRICE_NOTIFY_WEBHOOK"):
        try:
            send_webhook(config["PRICE_NOTIFY_WEBHOOK"], title, body, config.get("PRICE_NOTIFY_WEBHOOK_FORMAT", "text"))
            log("Bildirim: webhook gönderildi.")
            sent = True
        except Exception as exc:  # noqa: BLE001
            log(f"Bildirim: webhook başarısız ({type(exc).__name__}).")
    if config.get("PRICE_NOTIFY_SMTP_HOST") and config.get("PRICE_NOTIFY_MAIL_TO"):
        try:
            send_mail(config, title, body)
            log("Bildirim: e-posta gönderildi.")
            sent = True
        except Exception as exc:  # noqa: BLE001
            log(f"Bildirim: e-posta başarısız ({type(exc).__name__}).")
    if not sent and not (config.get("PRICE_NOTIFY_WEBHOOK") or config.get("PRICE_NOTIFY_SMTP_HOST")):
        log("Bildirim: ayarlı kanal yok (PRICE_NOTIFY_WEBHOOK ya da PRICE_NOTIFY_SMTP_* tanımla).")


# --- ana koşu --------------------------------------------------------------------------------------


def run_once(args: argparse.Namespace) -> int:
    project = project_root(args.project)
    problem = check_project(project)
    if problem:
        say(problem)
        return 2
    logdir = project / LOG_DIR
    logdir.mkdir(parents=True, exist_ok=True)
    state = load_state(logdir)

    if args.if_due and not args.dry_run:
        last = parse_dt(state.get("last_success_at"))
        if last and now() - last < timedelta(days=args.if_due):
            say(f"Atlandı: son başarılı koşu {last:%Y-%m-%d %H:%M}; {args.if_due} gün henüz dolmadı.")
            return 0

    if not acquire_lock(logdir):
        say("Atlandı: başka bir koşu sürüyor (logs/price-check/run.lock).")
        return 0
    try:
        return _execute(args, project, logdir, state)
    finally:
        release_lock(logdir)


def _execute(args: argparse.Namespace, project: Path, logdir: Path, state: Dict[str, Any]) -> int:
    started = now()
    stamp = started.strftime("%Y%m%d-%H%M%S")
    log_file = logdir / f"run-{stamp}.log"
    transcript: List[str] = []

    def log(message: str = "") -> None:
        transcript.append(message)
        say(message)

    config = load_notify_config(project)
    info: Dict[str, Any] = {"log_file": str(log_file.relative_to(project)), "when": started, "dry_run": args.dry_run, "status": "ok", "changes": [], "review": [], "expiring": [], "manual": [], "reasons": []}
    exit_code = 0
    backup: Optional[Path] = None
    products_path = project / "data" / "products.json"

    def finish(code: int) -> int:
        title, body = build_summary(info)
        (logdir / f"summary-{stamp}.md").write_text(body, encoding="utf-8")
        (logdir / "latest.md").write_text(body, encoding="utf-8")
        log_file.write_text("\n".join(transcript), encoding="utf-8")
        prune(logdir, "run-*.log", LOG_KEEP)
        prune(logdir, "summary-*.md", LOG_KEEP)
        state["last_run_at"] = started.isoformat(timespec="seconds")
        state["last_status"] = info["status"]
        state["last_title"] = title
        if info["status"] != "failed" and not args.dry_run:
            state["last_success_at"] = started.isoformat(timespec="seconds")
        save_state(logdir, state)
        say("")
        say(body)
        if not args.dry_run and not args.no_notify and should_notify(config.get("PRICE_NOTIFY_WHEN", "auto"), info["status"], bool(info["changes"])):
            notify(config, title, body, say)
        return code

    def fail(headline: str, code: int = 1) -> int:
        info["status"] = "failed"
        info["headline"] = headline
        return finish(code)

    if not has_openai_key(project):
        return fail("OPENAI_API_KEY bulunamadı (ortam değişkeni ya da .env.local). Fiyat kontrolü yapılamadı.", 2)
    npm = find_npm()
    if not npm:
        return fail("npm bulunamadı. Node.js kurulu ve PATH'te olmalı (ya da PRICE_NPM ile yolunu ver).", 2)

    before = load_products(products_path)
    if not args.dry_run:
        backup = backup_products(project, logdir, stamp)
        info["backup"] = str(backup.relative_to(project))
    original_bytes = products_path.read_bytes()

    def rollback(reason: str) -> int:
        if backup is not None:
            restore_products(project, backup)
            log("products.json yedekten GERİ YÜKLENDİ.")
        return fail(f"{reason} products.json eski haline GERİ ALINDI." if backup is not None else reason)

    # 1) fiyat kontrolü
    check_cmd = [npm, "run", "check:prices"]
    extra = []
    if args.dry_run:
        extra.append("--dry-run")
    if args.all:
        extra.append("--all")
    if args.max_age_days is not None:
        extra.append(f"--max-age-days={args.max_age_days}")
    extra += shlex.split(args.check_args or "")
    if extra:
        check_cmd += ["--"] + extra
    log(f"$ {' '.join(check_cmd)}")
    code, output = run_cmd(check_cmd, project, CHECK_TIMEOUT_S)
    transcript.append(output)
    tail = "\n".join(output.strip().splitlines()[-6:])
    if code is None:
        return rollback(f"check:prices {CHECK_TIMEOUT_S // 60} dakikada bitmedi (zaman aşımı).")
    if code not in (0, 1):
        log(tail)
        return rollback(f"check:prices çöktü (çıkış kodu {code}).")
    parsed = parse_check_output(output)
    if not parsed["counts"]:
        log(tail)
        return rollback("check:prices çıktısı anlaşılamadı (özet satırı yok).")
    info["counts"] = parsed["counts"]
    info["reasons"] = parsed["reasons"]

    # 2) katalog doğrulaması (yalnızca dosya değiştiyse)
    changed_file = products_path.read_bytes() != original_bytes
    if changed_file and not args.no_validate:
        validate_cmd = [npm, "run", "validate:catalog"]
        log(f"$ {' '.join(validate_cmd)}")
        vcode, voutput = run_cmd(validate_cmd, project, VALIDATE_TIMEOUT_S)
        transcript.append(voutput)
        if vcode != 0:
            log("\n".join(voutput.strip().splitlines()[-8:]))
            return rollback("validate:catalog başarısız oldu.")
    if changed_file and args.with_tests:
        test_cmd = [npm, "test"]
        log(f"$ {' '.join(test_cmd)}")
        tcode, toutput = run_cmd(test_cmd, project, TEST_TIMEOUT_S)
        transcript.append(toutput)
        if tcode != 0:
            log("\n".join(toutput.strip().splitlines()[-8:]))
            return rollback("npm test başarısız oldu.")

    # 3) sonuçları topla
    report_file = project / "data" / "price-report.md"
    report_text = extract_report_from_stdout(output) if args.dry_run else (report_file.read_text(encoding="utf-8") if report_file.is_file() else "")
    sections = parse_report(report_text)
    after = load_products(products_path)
    evidence = {}
    for item in sections.get("Değişti", []):
        name, _, rest = item.partition(": ")
        quote = rest.split("— kanıt:", 1)[1].strip() if "— kanıt:" in rest else ""
        evidence[name.strip()] = quote
    info["changes"] = [dict(c, evidence=evidence.get(c["name"], "")) for c in diff_prices(before, after)] if not args.dry_run else []
    info["review"] = sections.get("İnceleme gerekli (products.json'a YAZILMADI)", [])
    info["expiring"] = [i for i in sections.get("Doğrulaması 14 gün içinde sona erecek", [])]
    info["manual"] = sections.get("Sayfası elle alınarak çözülebilecekler", [])
    if code == 1 or info["review"] or info["expiring"]:
        info["status"] = "attention"
    if args.dry_run:
        info["proposed"] = [r["name"] for r in parsed["rows"] if r["label"] == "DEĞİŞTİ"]
    log(f"check:prices çıkış kodu {code}.")
    return finish(exit_code)


def cmd_loop(args: argparse.Namespace) -> int:
    say(f"Döngü başladı: her {args.every_days} günde bir çalışacak (kapatmak için Ctrl+C). Saatte bir kontrol edilir.")
    sub = argparse.Namespace(**vars(args))
    sub.if_due = args.every_days
    try:
        while True:
            run_once(sub)
            time.sleep(3600)
    except KeyboardInterrupt:
        say("Döngü durduruldu.")
        return 0


def build_schtasks_create(python: str, script: str, project: str, every_days: int, at: str) -> List[str]:
    task_run = f'"{python}" "{script}" run --project "{project}" --if-due {every_days}'
    return ["schtasks", "/Create", "/TN", TASK_NAME, "/SC", "DAILY", "/ST", at, "/TR", task_run, "/F"]


def cmd_install(args: argparse.Namespace) -> int:
    if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", args.at):
        say("--at SS:DD biçiminde olmalı (örn. 09:00).")
        return 2
    project = project_root(args.project)
    problem = check_project(project)
    if problem:
        say(problem)
        return 2
    script = str(Path(__file__).resolve())
    if os.name != "nt":
        say("Bu bilgisayar Windows değil. crontab -e ile şu satırı ekle (her gün bakar, 'run --if-due' süre dolmadıysa atlar):")
        say(f'0 {int(args.at[:2])} * * * cd "{project}" && {sys.executable} "{script}" run --project "{project}" --if-due {args.every_days} >> "{project}/{LOG_DIR}/cron.log" 2>&1')
        return 0
    cmd = build_schtasks_create(sys.executable, script, str(project), args.every_days, args.at)
    if len(cmd[cmd.index("/TR") + 1]) > 255:
        say("Komut satırı Windows görev zamanlayıcının sınırını (261 karakter) aşıyor. Projeyi ve betiği daha kısa bir klasör yoluna taşı.")
        return 2
    done = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    say((done.stdout or done.stderr).strip())
    if done.returncode == 0:
        say(f"Görev kuruldu: {TASK_NAME}. Her gün {args.at}'te bakar; son başarılı koşudan {args.every_days} gün geçtiyse çalıştırır.")
        say("Not: görev yalnızca bilgisayar açıkken ve sen oturum açmışken çalışır; kapalıysa ertesi gün yakalar.")
    return done.returncode


def cmd_uninstall(_: argparse.Namespace) -> int:
    if os.name != "nt":
        say("Bu bilgisayar Windows değil; crontab -e ile ilgili satırı sil.")
        return 0
    done = subprocess.run(["schtasks", "/Delete", "/TN", TASK_NAME, "/F"], capture_output=True, text=True, errors="replace")
    say((done.stdout or done.stderr).strip())
    return done.returncode


def cmd_status(args: argparse.Namespace) -> int:
    project = project_root(args.project)
    logdir = project / LOG_DIR
    state = load_state(logdir)
    if not state:
        say("Henüz koşu yok. Dene: python scripts/price_scheduler.py run --dry-run")
    else:
        say(f"Son koşu: {state.get('last_run_at')}  durum: {state.get('last_status')}")
        say(f"Son başarılı koşu: {state.get('last_success_at', 'yok')}")
        say(state.get("last_title", ""))
        say(f"Özet: {logdir / 'latest.md'}")
    if os.name == "nt":
        done = subprocess.run(["schtasks", "/Query", "/TN", TASK_NAME], capture_output=True, text=True, errors="replace")
        say(done.stdout.strip() if done.returncode == 0 else f"Zamanlanmış görev kurulu değil ({TASK_NAME}). Kurmak için: python scripts/price_scheduler.py install")
    return 0


def cmd_restore(args: argparse.Namespace) -> int:
    project = project_root(args.project)
    folder = project / LOG_DIR / "backup"
    backups = sorted((b for b in folder.glob("products-*.json") if "before-restore" not in b.name), key=lambda b: b.stat().st_mtime, reverse=True)
    if not backups:
        say("Yedek yok.")
        return 1
    chosen = backups[0]
    say(f"Geri yüklenecek yedek: {chosen.name}")
    if not args.yes:
        say("Onaylamak için komuta --yes ekle. Mevcut products.json önce yedeklenir.")
        return 0
    backup_products(project, project / LOG_DIR, "before-restore-" + now().strftime("%Y%m%d-%H%M%S"))
    restore_products(project, chosen)
    say("products.json geri yüklendi. Sonra: npm run validate:catalog")
    return 0


def cmd_notify_test(args: argparse.Namespace) -> int:
    project = project_root(args.project)
    config = load_notify_config(project)
    notify(config, "[RouteAI fiyat] deneme", "Bu bir deneme bildirimidir.", say)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="RouteAI fiyat doğrulama zamanlayıcısı", formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--project", help="RouteAI proje klasörü (varsayılan: bu betiğin üst klasörü)")
    sub = parser.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="bir kez çalıştır")
    run.add_argument("--dry-run", action="store_true", help="hiçbir dosyayı değiştirme")
    run.add_argument("--all", action="store_true", help="taze olanlar dahil tüm ürünleri kontrol et")
    run.add_argument("--max-age-days", type=int, help="bu günden eski doğrulamaları kontrol et (varsayılan 21)")
    run.add_argument("--if-due", type=int, metavar="GÜN", help="son başarılı koşudan bu kadar gün geçmediyse atla")
    run.add_argument("--with-tests", action="store_true", help="değişiklik sonrası npm test de çalıştır (başarısızsa geri al)")
    run.add_argument("--no-validate", action="store_true", help="validate:catalog çalıştırma")
    run.add_argument("--no-notify", action="store_true", help="bildirim gönderme")
    run.add_argument("--check-args", default="", help='check:prices\'e ek seçenekler, örn. "--only=ideogram-20"')
    run.set_defaults(func=run_once)

    loop = sub.add_parser("loop", help="açık kaldığı sürece her N günde bir çalıştır")
    loop.add_argument("--every-days", type=int, default=7)
    for flag in ("--dry-run", "--all", "--with-tests", "--no-validate", "--no-notify"):
        loop.add_argument(flag, action="store_true")
    loop.add_argument("--max-age-days", type=int)
    loop.add_argument("--check-args", default="")
    loop.set_defaults(func=cmd_loop)

    install = sub.add_parser("install", help="Windows zamanlanmış görevi kur (diğer sistemlerde crontab satırı yazar)")
    install.add_argument("--every-days", type=int, default=7)
    install.add_argument("--at", default="09:00", help="SS:DD, örn. 09:00")
    install.set_defaults(func=cmd_install)

    sub.add_parser("uninstall", help="zamanlanmış görevi sil").set_defaults(func=cmd_uninstall)
    sub.add_parser("status", help="son koşuyu ve görevi göster").set_defaults(func=cmd_status)
    restore = sub.add_parser("restore", help="son yedeği products.json olarak geri yükle")
    restore.add_argument("--yes", action="store_true")
    restore.set_defaults(func=cmd_restore)
    sub.add_parser("notify-test", help="bildirim ayarlarını dene").set_defaults(func=cmd_notify_test)
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if stream is not None and hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
            except (OSError, ValueError):
                pass
    args = build_parser().parse_args(argv)
    return int(args.func(args) or 0)


if __name__ == "__main__":
    sys.exit(main())
