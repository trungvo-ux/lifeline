import { HomeExperience } from "@/components/home-experience"
import { LifelineShell } from "@/components/lifeline-shell"
import type { Viewport } from "next"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
}

export default async function Home() {
  return (
    <LifelineShell>
      <HomeExperience />
    </LifelineShell>
  )
}
