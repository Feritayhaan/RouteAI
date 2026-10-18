// Sunucu bileşenleri için cihaz sınıfı: proxy.ts'in başlığı -> User-Agent.

import { headers } from "next/headers";
import { DEVICE_HEADER, classifyRequest, isDevice, type DeviceClass } from "./classify";

export async function currentDevice(): Promise<DeviceClass> {
  const h = await headers();
  const fromProxy = h.get(DEVICE_HEADER);
  if (isDevice(fromProxy)) return fromProxy;
  return classifyRequest({ userAgent: h.get("user-agent"), chUaMobile: h.get("sec-ch-ua-mobile") });
}
