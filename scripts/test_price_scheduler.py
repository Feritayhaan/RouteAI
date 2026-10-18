#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""price_scheduler.py testleri. Gerçek npm yerine sahte bir npm kullanır; ağ, OpenAI ve Node gerekmez.

Çalıştırma:  python scripts/test_price_scheduler.py -v
(Linux/macOS içindir; sahte npm bir Python betiğidir.)
"""
import contextlib
import importlib.util
import io
import json
import os
import stat
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from unittest import mock

SPEC = importlib.util.spec_from_file_location("price_scheduler", Path(__file__).with_name("price_scheduler.py"))
ps = importlib.util.module_from_spec(SPEC)
sys.modules["price_scheduler"] = ps
SPEC.loader.exec_module(ps)

FAKE_NPM = r'''#!/usr/bin/env python3
import json, os, sys, time
args = sys.argv[1:]
scenario = os.environ.get("FAKE_SCENARIO", "change")
path = os.path.join(os.getcwd(), "data", "products.json")
SUMMARY = "[check-prices] değişti %d, teyit 0, inceleme %d, emin değil 0, hata %d, pricingUrl yok 0, atlandı (taze) 2. Doğrulanmış: 40/56"
REPORT = (
    "# Fiyat raporu\n\n## Değişti (1)\n\n- Alpha: freemium 10 USD → freemium 11 USD (https://a) — kanıt: \"Pro $11 per month\"\n\n"
    "## İnceleme gerekli (products.json'a YAZILMADI) (1)\n\n- Beta (`beta`): kanıt yıllık faturalamayı gösteriyor. Onaylamak için: `npm run check:prices -- --accept=beta`\n\n"
    "## Sayfası elle alınarak çözülebilecekler (1)\n\n- Gamma: sayfayı tarayıcıda aç, Ctrl+A, Ctrl+C, sonra `npm run price:snap -- gamma`\n\n"
    "## Doğrulaması 14 gün içinde sona erecek (1)\n\n- Delta (`delta`): 5 gün kaldı\n"
)
CLEAN_REPORT = "# Fiyat raporu\n\n## Değişti (0)\n\n- yok\n\n## İnceleme gerekli (products.json'a YAZILMADI) (0)\n\n- yok\n\n## Doğrulaması 14 gün içinde sona erecek (0)\n\n- yok\n"
if args[:2] == ["run", "check:prices"]:
    dry = "--dry-run" in args
    if scenario == "crash":
        print("boom", file=sys.stderr); sys.exit(2)
    if scenario == "hang":
        time.sleep(30)
    if scenario == "garbage":
        print("merhaba"); sys.exit(0)
    print("[check-prices] başladı: ürünler sırayla kontrol ediliyor (her ürün birkaç saniye, toplam birkaç dakika sürebilir)...")
    if scenario == "clean":
        print("[check-prices] 1. Alpha: teyit"); print(SUMMARY % (0, 0, 0)); report = CLEAN_REPORT
    else:
        print("[check-prices] 1. Alpha: DEĞİŞTİ"); print("[check-prices] 2. Beta: İNCELEME (kanıt yıllık faturalamayı gösteriyor)")
        print("[check-prices] 3. Gamma: HATA (HTTP 403 (bot engeli ya da giriş isteniyor olabilir). Çözüm: npm run price:snap -- gamma)")
        print(SUMMARY % (1, 1, 1)); report = REPORT
    if scenario in ("change", "badcatalog", "badtests") and not dry:
        data = json.load(open(path, encoding="utf-8"))
        for p in data:
            if p["id"] == "alpha":
                p["pricing"]["startingPrice"] = 11
        json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        open(os.path.join(os.getcwd(), "data", "price-report.md"), "w", encoding="utf-8").write(report)
    elif dry:
        print(report)
    if scenario == "red":
        print("[check-prices] Kontrol edilen 9 üründen 8'i hata/emin değil (sistemik sorun: engel, anahtar ya da sayfa yapısı)."); sys.exit(1)
    sys.exit(0)
if args[:2] == ["run", "validate:catalog"]:
    print("[validate:catalog] deneme")
    sys.exit(1 if scenario == "badcatalog" else 0)
if args == ["test"]:
    sys.exit(1 if scenario == "badtests" else 0)
print("bilinmeyen komut", args, file=sys.stderr); sys.exit(9)
'''


def product(pid, name, price):
    return {"id": pid, "name": name, "status": "active", "pricing": {"model": "freemium", "startingPrice": price, "priceCheckedAt": "2026-08-01"}}


class Receiver(BaseHTTPRequestHandler):
    bodies = []

    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("Content-Length", 0))
        Receiver.bodies.append((self.headers.get("Content-Type"), self.rfile.read(length).decode("utf-8")))
        self.send_response(200)
        self.end_headers()

    def log_message(self, *args):  # sessiz
        pass


class SchedulerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.project = root / "proj"
        (self.project / "data").mkdir(parents=True)
        (self.project / "package.json").write_text("{}", encoding="utf-8")
        self.products = [product("alpha", "Alpha", 10), product("beta", "Beta", 20)]
        self.products_path = self.project / "data" / "products.json"
        self.products_path.write_text(json.dumps(self.products, ensure_ascii=False, indent=2), encoding="utf-8")
        (self.project / ".env.local").write_text("OPENAI_API_KEY=sk-test\r\nPRICE_NOTIFY_WHEN=auto\r\n", encoding="utf-8")
        self.original = self.products_path.read_bytes()
        npm = root / "fakebin" / "npm"
        npm.parent.mkdir()
        npm.write_text(FAKE_NPM, encoding="utf-8")
        npm.chmod(npm.stat().st_mode | stat.S_IEXEC)
        env = {"PRICE_NPM": str(npm), "FAKE_SCENARIO": "change"}
        self.patch = mock.patch.dict(os.environ, env)
        self.patch.start()
        for key in [k for k in os.environ if k.startswith("PRICE_NOTIFY_") or k == "OPENAI_API_KEY"]:
            os.environ.pop(key)
        Receiver.bodies = []
        self.server = HTTPServer(("127.0.0.1", 0), Receiver)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.hook = f"http://127.0.0.1:{self.server.server_address[1]}/konu"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.patch.stop()
        self.tmp.cleanup()

    def main(self, *argv, scenario=None):
        if scenario:
            os.environ["FAKE_SCENARIO"] = scenario
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = ps.main(["--project", str(self.project), *argv])
        return code, out.getvalue()

    def price_of(self, pid):
        data = json.loads(self.products_path.read_text(encoding="utf-8"))
        return next(p for p in data if p["id"] == pid)["pricing"]["startingPrice"]

    # --- ayrıştırma ---------------------------------------------------------------------------

    def test_parse_check_output_gercek_cikti(self):
        text = (
            "[check-prices] başladı: ürünler sırayla kontrol ediliyor (her ürün birkaç saniye, toplam birkaç dakika sürebilir)...\n"
            "[check-prices] 1. ChatGPT (görsel): HATA (HTTP 403 (bot engeli ya da giriş isteniyor olabilir))\n"
            "[check-prices] 2. DALL-E (OpenAI): pricingUrl yok\n"
            "[check-prices] 10. Copy.ai: DEĞİŞTİ\n"
            "[check-prices] 20. Beautiful.ai: İNCELEME (sayfada yalnızca yıllık faturalamalı aylık fiyat var)\n"
            "[check-prices] 30. n8n AI Workflow Builder: emin değil\n"
            "[check-prices] değişti 7, teyit 1, inceleme 4, emin değil 12, hata 9, pricingUrl yok 10, atlandı (taze) 13. Doğrulanmış: 21/56\n"
            "[check-prices] Kontrol edilen 33 üründen 21'i hata/emin değil (sistemik sorun: engel, anahtar ya da sayfa yapısı).\n"
        )
        parsed = ps.parse_check_output(text)
        self.assertEqual(parsed["counts"], {"changed": 7, "same": 1, "review": 4, "unknown": 12, "error": 9, "no_url": 10, "fresh": 13, "verified": 21, "active": 56})
        self.assertEqual([r["label"] for r in parsed["rows"]], ["HATA", "pricingUrl yok", "DEĞİŞTİ", "İNCELEME", "emin değil"])
        self.assertEqual(parsed["rows"][0]["name"], "ChatGPT (görsel)")
        self.assertEqual(len(parsed["reasons"]), 1)
        self.assertIn("sistemik sorun", parsed["reasons"][0])
        self.assertIsNone(ps.parse_check_output("hiçbir şey")["counts"])

    def test_parse_report_ve_diff(self):
        sections = ps.parse_report("# Fiyat raporu\n\n## Değişti (2)\n\n- A: x\n- B: y\n\n## Hata (0)\n\n- yok\n")
        self.assertEqual(sections["Değişti"], ["A: x", "B: y"])
        self.assertEqual(sections["Hata"], [])
        before = [product("a", "A", 10), product("b", "B", 5)]
        after = [product("a", "A", 11), dict(product("b", "B", 5), pricing={"model": "freemium", "startingPrice": 5, "priceCheckedAt": "2026-10-14"})]
        changes = ps.diff_prices(before, after)
        self.assertEqual([c["id"] for c in changes], ["a"], "sadece tarihi tazelenen ürün değişiklik sayılmaz")

    def test_env_dosyasi_crlf_tirnak_onek(self):
        env = self.project / "x.env"
        env.write_bytes('# yorum\r\nPRICE_NOTIFY_WEBHOOK="https://x/y"\r\nOPENAI_API_KEY=gizli\r\nPRICE_NOTIFY_WHEN=always\r\n'.encode("utf-8"))
        got = ps.read_env_file(env, prefix="PRICE_NOTIFY_")
        self.assertEqual(got, {"PRICE_NOTIFY_WEBHOOK": "https://x/y", "PRICE_NOTIFY_WHEN": "always"})
        self.assertNotIn("OPENAI_API_KEY", got)

    # --- koşu akışları -------------------------------------------------------------------------

    def test_basarili_kosu_yedek_ozet_durum_bildirim(self):
        os.environ["PRICE_NOTIFY_WEBHOOK"] = self.hook
        code, out = self.main("run")
        self.assertEqual(code, 0)
        self.assertEqual(self.price_of("alpha"), 11)
        backups = list((self.project / "logs/price-check/backup").glob("products-*.json"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_bytes(), self.original)
        latest = (self.project / "logs/price-check/latest.md").read_text(encoding="utf-8")
        self.assertIn("DİKKAT", latest)
        self.assertIn("Alpha (`alpha`): freemium 10 → freemium 11 USD — kanıt: \"Pro $11 per month\"", latest)
        self.assertIn("kanıt yıllık faturalamayı gösteriyor", latest)
        self.assertIn("npm run price:snap -- --guided", latest)
        self.assertIn("Delta", latest)
        state = json.loads((self.project / "logs/price-check/state.json").read_text(encoding="utf-8"))
        self.assertEqual(state["last_status"], "attention")
        self.assertIn("last_success_at", state)
        self.assertEqual(len(Receiver.bodies), 1)
        self.assertIn("RouteAI fiyat", Receiver.bodies[0][1])
        self.assertNotIn("sk-test", out + Receiver.bodies[0][1] + latest, "anahtar hiçbir yere sızmaz")

    def test_temiz_kosu_sessiz(self):
        os.environ["PRICE_NOTIFY_WEBHOOK"] = self.hook
        code, out = self.main("run", scenario="clean")
        self.assertEqual(code, 0)
        state = json.loads((self.project / "logs/price-check/state.json").read_text(encoding="utf-8"))
        self.assertEqual(state["last_status"], "ok")
        self.assertEqual(Receiver.bodies, [], "sorun ve değişiklik yoksa bildirim yok (auto)")
        os.environ["PRICE_NOTIFY_WHEN"] = "always"
        self.main("run", scenario="clean")
        self.assertEqual(len(Receiver.bodies), 1)

    def test_validate_basarisiz_geri_alir(self):
        os.environ["PRICE_NOTIFY_WEBHOOK"] = self.hook
        code, out = self.main("run", scenario="badcatalog")
        self.assertEqual(code, 1)
        self.assertEqual(self.products_path.read_bytes(), self.original, "eski haline döndü")
        self.assertIn("GERİ ALINDI", (self.project / "logs/price-check/latest.md").read_text(encoding="utf-8"))
        state = json.loads((self.project / "logs/price-check/state.json").read_text(encoding="utf-8"))
        self.assertEqual(state["last_status"], "failed")
        self.assertNotIn("last_success_at", state)
        self.assertEqual(len(Receiver.bodies), 1, "başarısızlık bildirilir")

    def test_testler_basarisiz_geri_alir(self):
        code, _ = self.main("run", "--with-tests", scenario="badtests")
        self.assertEqual(code, 1)
        self.assertEqual(self.products_path.read_bytes(), self.original)

    def test_cokme_cikti_anlasilmazligi_zaman_asimi(self):
        code, out = self.main("run", scenario="crash")
        self.assertEqual(code, 1)
        self.assertIn("çöktü", out)
        self.assertEqual(self.products_path.read_bytes(), self.original)
        code, out = self.main("run", scenario="garbage")
        self.assertEqual(code, 1)
        self.assertIn("anlaşılamadı", out)
        with mock.patch.object(ps, "CHECK_TIMEOUT_S", 1):
            code, out = self.main("run", scenario="hang")
        self.assertEqual(code, 1)
        self.assertIn("zaman aşımı", out)
        self.assertEqual(self.products_path.read_bytes(), self.original)

    def test_kirmizi_cikis_dikkat_olarak_islenir(self):
        code, out = self.main("run", scenario="red")
        self.assertEqual(code, 0)
        self.assertIn("sistemik sorun", out)
        self.assertEqual(json.loads((self.project / "logs/price-check/state.json").read_text(encoding="utf-8"))["last_status"], "attention")

    def test_dry_run_dosya_degistirmez_bildirmez(self):
        os.environ["PRICE_NOTIFY_WEBHOOK"] = self.hook
        code, out = self.main("run", "--dry-run")
        self.assertEqual(code, 0)
        self.assertEqual(self.products_path.read_bytes(), self.original)
        self.assertFalse((self.project / "logs/price-check/backup").exists())
        state = json.loads((self.project / "logs/price-check/state.json").read_text(encoding="utf-8"))
        self.assertNotIn("last_success_at", state)
        self.assertIn("deneme koşusu", out)
        self.assertIn("Yazılacak olan değişiklikler (1)", out)
        self.assertEqual(Receiver.bodies, [])

    def test_if_due_atlar_ve_sure_dolunca_calisir(self):
        self.assertEqual(self.main("run", "--if-due", "7")[0], 0)
        first = json.loads((self.project / "logs/price-check/state.json").read_text(encoding="utf-8"))["last_run_at"]
        code, out = self.main("run", "--if-due", "7")
        self.assertIn("Atlandı", out)
        self.assertEqual(json.loads((self.project / "logs/price-check/state.json").read_text(encoding="utf-8"))["last_run_at"], first)
        state_path = self.project / "logs/price-check/state.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state["last_success_at"] = "2020-01-01T00:00:00"
        state_path.write_text(json.dumps(state), encoding="utf-8")
        code, out = self.main("run", "--if-due", "7")
        self.assertNotIn("Atlandı", out)

    def test_anahtar_yoksa_ayar_hatasi(self):
        (self.project / ".env.local").write_text("BASKA=1\n", encoding="utf-8")
        code, out = self.main("run")
        self.assertEqual(code, 2)
        self.assertIn("OPENAI_API_KEY bulunamadı", out)
        self.assertEqual(self.products_path.read_bytes(), self.original)

    def test_kilit_baska_kosu_varken_atlar(self):
        logdir = self.project / "logs/price-check"
        logdir.mkdir(parents=True)
        (logdir / "run.lock").write_text("1 now", encoding="utf-8")
        code, out = self.main("run")
        self.assertEqual(code, 0)
        self.assertIn("başka bir koşu sürüyor", out)
        self.assertEqual(self.products_path.read_bytes(), self.original)
        old = 1_000_000_000
        os.utime(logdir / "run.lock", (old, old))
        self.assertEqual(self.main("run")[0], 0)
        self.assertEqual(self.price_of("alpha"), 11, "takılı kalmış eski kilit temizlendi")
        self.assertFalse((logdir / "run.lock").exists(), "koşu bitince kilit kalkar")

    def test_yanlis_klasor(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = ps.main(["--project", self.tmp.name, "run"])
        self.assertEqual(code, 2)
        self.assertIn("RouteAI projesi gibi görünmüyor", out.getvalue())

    def test_restore(self):
        self.main("run")
        self.assertEqual(self.price_of("alpha"), 11)
        code, out = self.main("restore")
        self.assertIn("--yes", out)
        self.assertEqual(self.price_of("alpha"), 11, "onaysız dokunmaz")
        self.main("restore", "--yes")
        self.assertEqual(self.price_of("alpha"), 10)

    def test_yedekler_sinirlanir(self):
        folder = self.project / "logs/price-check/backup"
        folder.mkdir(parents=True)
        for i in range(30):
            f = folder / f"products-2020{i:04d}.json"
            f.write_text("[]", encoding="utf-8")
            os.utime(f, (1_000_000 + i, 1_000_000 + i))
        self.main("run")
        self.assertLessEqual(len(list(folder.glob("products-*.json"))), ps.BACKUP_KEEP)

    # --- bildirim ve zamanlama ------------------------------------------------------------------

    def test_webhook_json_bicimi_ve_hata_yutulur(self):
        ps.send_webhook(self.hook, "Başlık", "Gövde", "json")
        content_type, body = Receiver.bodies[-1]
        self.assertEqual(content_type, "application/json")
        self.assertEqual(json.loads(body)["text"], "Başlık\n\nGövde")
        messages = []
        ps.notify({"PRICE_NOTIFY_WEBHOOK": "http://127.0.0.1:1/yok"}, "b", "g", messages.append)
        self.assertTrue(any("webhook başarısız" in m for m in messages))
        messages.clear()
        ps.notify({}, "b", "g", messages.append)
        self.assertTrue(any("ayarlı kanal yok" in m for m in messages))

    def test_eposta_starttls_ve_giris(self):
        config = {"PRICE_NOTIFY_SMTP_HOST": "smtp.example", "PRICE_NOTIFY_SMTP_PORT": "587", "PRICE_NOTIFY_SMTP_USER": "u", "PRICE_NOTIFY_SMTP_PASS": "p", "PRICE_NOTIFY_MAIL_TO": "a@b.c"}
        with mock.patch.object(ps.smtplib, "SMTP") as smtp:
            ps.send_mail(config, "Konu", "Gövde")
        instance = smtp.return_value
        smtp.assert_called_once_with("smtp.example", 587, timeout=30)
        instance.starttls.assert_called_once()
        instance.login.assert_called_once_with("u", "p")
        sent = instance.send_message.call_args[0][0]
        self.assertEqual((sent["Subject"], sent["To"], sent["From"]), ("Konu", "a@b.c", "u"))
        instance.quit.assert_called_once()

    def test_bildirim_politikasi(self):
        self.assertTrue(ps.should_notify("auto", "attention", False))
        self.assertTrue(ps.should_notify("auto", "ok", True))
        self.assertFalse(ps.should_notify("auto", "ok", False))
        self.assertTrue(ps.should_notify("failed", "failed", False))
        self.assertFalse(ps.should_notify("failed", "attention", True))
        self.assertTrue(ps.should_notify("always", "ok", False))
        self.assertFalse(ps.should_notify("never", "failed", True))

    def test_windows_gorev_komutu(self):
        cmd = ps.build_schtasks_create(r"C:\Python312\python.exe", r"C:\RouteAI\scripts\price_scheduler.py", r"C:\RouteAI", 7, "09:00")
        self.assertEqual(cmd[:4], ["schtasks", "/Create", "/TN", "RouteAI-PriceCheck"])
        self.assertIn("DAILY", cmd)
        tr = cmd[cmd.index("/TR") + 1]
        self.assertEqual(tr, r'"C:\Python312\python.exe" "C:\RouteAI\scripts\price_scheduler.py" run --project "C:\RouteAI" --if-due 7')
        self.assertEqual(cmd[-1], "/F")

    def test_install_gecersiz_saat_ve_cron_satiri(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(ps.main(["--project", str(self.project), "install", "--at", "25:99"]), 2)
        out = io.StringIO()
        with contextlib.redirect_stdout(out), mock.patch.object(ps.os, "name", "posix"):
            self.assertEqual(ps.main(["--project", str(self.project), "install", "--every-days", "7", "--at", "08:30"]), 0)
        self.assertIn("0 8 * * *", out.getvalue())
        self.assertIn("--if-due 7", out.getvalue())


if __name__ == "__main__":
    unittest.main()
