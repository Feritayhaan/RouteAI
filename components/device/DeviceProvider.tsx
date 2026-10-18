"use client"

// Cihaz sınıfı (mobile / tablet / desktop) ve yan yana düzen bilgisi.
// İlk render sunucunun tahmini (proxy.ts -> layout): hidrasyon uyuşmazlığı ve
// ilk ekranda kayma olmaz. Sonra matchMedia ile ölçülür; pencere boyutu ya da
// yön değişince güncellenir ve <html data-device / data-split> de güncellenir
// (Tailwind `mobile:` `tablet:` `desktop:` varyantları bunlara bakar).

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"
import {
  SPLIT_MIN_WIDTH,
  TABLET_MIN_WIDTH,
  classifyViewport,
  isDevice,
  isSplit,
  serverSplit,
  type DeviceClass,
} from "@/lib/device/classify"

export interface DeviceInfo {
  device: DeviceClass
  /** Yan yana düzen (genişlik ≥ 1024): yatay tablet ve masaüstü. */
  split: boolean
  /** Ana işaretçi dokunmatik. */
  touch: boolean
}

const QUERIES = [
  `(min-width: ${TABLET_MIN_WIDTH}px)`,
  `(min-width: ${SPLIT_MIN_WIDTH}px)`,
  "(pointer: coarse)",
  "(hover: hover)",
]

// Anlık görüntü ilkel olmalı (useSyncExternalStore aynı değeri aynı kabul etsin).
const key = ({ device, split, touch }: DeviceInfo) => `${device}|${split ? 1 : 0}|${touch ? 1 : 0}`
const parse = (k: string): DeviceInfo => {
  const [device, split, touch] = k.split("|")
  return { device: isDevice(device) ? device : "desktop", split: split === "1", touch: touch === "1" }
}

function measure(): string {
  const width = window.innerWidth
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches
  const hover = window.matchMedia("(hover: hover)").matches
  return key({ device: classifyViewport({ width, coarsePointer, hover }), split: isSplit(width), touch: coarsePointer })
}

function subscribe(onChange: () => void) {
  const lists = QUERIES.map((q) => window.matchMedia(q))
  lists.forEach((l) => l.addEventListener("change", onChange))
  return () => lists.forEach((l) => l.removeEventListener("change", onChange))
}

const initialInfo = (device: DeviceClass): DeviceInfo => ({ device, split: serverSplit(device), touch: device !== "desktop" })

const DeviceContext = createContext<DeviceInfo>(initialInfo("desktop"))

export function DeviceProvider({ initial, children }: { initial: DeviceClass; children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, measure, () => key(initialInfo(initial)))
  const info = useMemo(() => parse(snapshot), [snapshot])

  useEffect(() => {
    const html = document.documentElement
    html.dataset.device = info.device
    html.dataset.split = String(info.split)
  }, [info])

  return <DeviceContext.Provider value={info}>{children}</DeviceContext.Provider>
}

export function useDevice(): DeviceInfo {
  return useContext(DeviceContext)
}
