import type { en } from './en';

/** Sabit metin literal'lerini string'e genişletir; dizi uzunluğu korunur. */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? { readonly [K in keyof T]: Widen<U> }
    : { readonly [K in keyof T]: Widen<T[K]> };

/** tr.ts bu tipe uymak zorunda: eksik ya da fazla anahtar derleme hatası. */
export type Dictionary = Widen<typeof en>;
