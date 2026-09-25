import { permanentRedirect } from "next/navigation"

// Navigasyon arayüzü yeniden ana sayfada; eski /classic linkleri oraya gider.
export default function ClassicPage() {
  permanentRedirect("/")
}
