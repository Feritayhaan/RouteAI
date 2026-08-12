// RouteAI fiyat mantiginin TEK kaynagi.
//
// Eskiden fiyat uc ayri boolean'da (free/freemium/paidOnly) tutuluyordu ve her
// okuyucu kendi turetmesini yaziyordu. Sonuc: freemium bir arac hem "Ucretsiz"
// hem "Ucretli" filtresine giriyordu, rozetlerde "Free" ve "Freemium" yan yana
// cikiyordu. Artik tek dogru alan `model`; bayraklar ondan turetilir.
//
// Iki kural:
//  1. Fiyat nesnesi elle yazilmaz, makePricing() ile uretilir.
//  2. startingPrice icin `{price && ...}` kalimi KULLANILMAZ. 0 gecerli bir
//     fiyattir (ucretsiz), null ise "veri girilmemis" demektir; JSX'te 0 falsy
//     oldugu halde ekrana basildigi icin bu kalip ciplak "0" yaziyordu.

export type PricingModel = 'free' | 'freemium' | 'paid';
export type PriceStatus = 'verified' | 'unknown' | 'stale';
export type PricingFilter = 'all' | 'free' | 'paid';

export const PRICING_MODELS = ['free', 'freemium', 'paid'] as const;
export const PRICE_STATUSES = ['verified', 'unknown', 'stale'] as const;

/**
 * Fiyat bu gun sayisindan daha eski dogrulanmissa 'stale' sayilir.
 * scripts/migrate-pricing.mjs ayni sabiti kendi icinde tasir (o dosya derleme
 * hattinin disinda, duz node ile calisiyor).
 */
export const PRICE_STALE_AFTER_DAYS = 60;

/** Bir aracin kanonik fiyat nesnesi. makePricing() disinda uretilmemeli. */
export interface ToolPricing {
    /** Tek dogru alan. Diger bayraklar bundan turer. */
    model: PricingModel;
    /** model'den TURETILIR — geri uyum icin JSON'da duruyor, elle yazma. */
    free: boolean;
    freemium: boolean;
    paidOnly: boolean;
    /** null = veri girilmemis. 0 = gercekten ucretsiz. Bu ayrimi bozma. */
    startingPrice: number | null;
    currency: 'USD';
    priceStatus: PriceStatus;
    /** Fiyatin en son dogrulandigi tarih (YYYY-MM-DD). Bilinmiyorsa null. */
    priceCheckedAt?: string | null;
}

/**
 * Okuyucu tarafi tipi: KV'de duran migration oncesi kayitlar ve eski API
 * cevaplari hala eksik alanli gelebilir. Helper'lar bu gevsek sekli kabul eder,
 * ToolPricing ise buna atanabilir.
 */
export interface PricingLike {
    model?: PricingModel;
    free?: boolean;
    freemium?: boolean;
    paidOnly?: boolean;
    startingPrice?: number | null;
    currency?: string;
    priceStatus?: PriceStatus;
    priceCheckedAt?: string | null;
}

type MaybePricing = PricingLike | null | undefined;

function isPricingModel(value: unknown): value is PricingModel {
    return PRICING_MODELS.includes(value as PricingModel);
}

/**
 * Bir fiyat nesnesinin modelini verir.
 * model alani yoksa eski bayraklardan turetir (geri uyum). Bayraklar celisikse
 * ya da hicbiri set degilse 'paid'e duser: veri yoklugunda "ucretsiz" demek,
 * kullaniciyi yanlis yone gonderen tek hata turudur.
 */
export function getPricingModel(pricing: MaybePricing): PricingModel {
    if (isPricingModel(pricing?.model)) return pricing.model;
    if (pricing?.paidOnly) return 'paid';
    if (pricing?.freemium) return 'freemium';
    if (pricing?.free) return 'free';
    return 'paid';
}

/** Ucretsiz bir kullanim yolu var mi? (free veya freemium) */
export function hasFreeTier(pricing: MaybePricing): boolean {
    const model = getPricingModel(pricing);
    return model === 'free' || model === 'freemium';
}

/** SADECE parali mi? freemium buraya GIRMEZ — ayrimin coktugu yer burasiydi. */
export function isPaidOnly(pricing: MaybePricing): boolean {
    return getPricingModel(pricing) === 'paid';
}

export function matchesPricingFilter(pricing: MaybePricing, filter?: PricingFilter): boolean {
    if (!filter || filter === 'all') return true;
    if (filter === 'free') return hasFreeTier(pricing);
    return isPaidOnly(pricing);
}

export function isPriceStale(checkedAt?: string | null, now: number = Date.now()): boolean {
    if (!checkedAt) return true;
    const checked = Date.parse(checkedAt);
    if (Number.isNaN(checked)) return true;
    return now - checked > PRICE_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Ekranda gosterilecek fiyat metni. Bilinmiyorsa null doner — cagiran taraf
 * ne yazacagina karar verir. `{formatPrice(p) && ...}` yazmak yerine
 * priceLabelOrUnknown() kullan.
 */
export function formatPrice(pricing: MaybePricing): string | null {
    if (getPricingModel(pricing) === 'free') return 'Ücretsiz';
    const price = pricing?.startingPrice;
    if (price === null || price === undefined || price === 0) return null;
    return `$${price}/ay`;
}

export function priceLabelOrUnknown(pricing: MaybePricing): string {
    return formatPrice(pricing) ?? 'Fiyat bilinmiyor';
}

export function pricingModelLabel(pricing: MaybePricing): string {
    const model = getPricingModel(pricing);
    if (model === 'free') return 'Ücretsiz';
    if (model === 'freemium') return 'Freemium';
    return 'Ücretli';
}

/**
 * Tool.pricing fabrikasi. Bayraklar model'den turedigi icin celiskili bir fiyat
 * nesnesi yazmak imkansiz hale gelir.
 *
 * checkedAt verilmezse fiyat 'stale' sayilir: kimse dogrulamadiysa taze
 * oldugunu iddia edemeyiz.
 */
export function makePricing(
    model: PricingModel,
    price: number | null = null,
    checkedAt: string | null = null
): ToolPricing {
    const startingPrice = model === 'free' ? 0 : price ?? null;
    const priceStatus: PriceStatus =
        startingPrice === null ? 'unknown' : isPriceStale(checkedAt) ? 'stale' : 'verified';

    return {
        model,
        free: model === 'free',
        freemium: model === 'freemium',
        paidOnly: model === 'paid',
        startingPrice,
        currency: 'USD',
        priceStatus,
        priceCheckedAt: startingPrice === null ? null : checkedAt,
    };
}
