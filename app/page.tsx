import { HomeExperience } from "@/components/home-experience"
import { LifelineShell } from "@/components/lifeline-shell"
import { SiteHeader } from "@/components/site-header"

export default function Home() {
  return (
    <LifelineShell>
      {/* About, in place of the old nav. It carries no `data-site-nav-*`
          hooks, so the rail below stops following the chrome and fills its
          own container edge to edge instead.

          The name sticks to the top on phone and tablet — it is a direct
          child of the shell, which spans the whole page, so it holds for
          the full scroll rather than only while the about block is in
          view. Desktop is a fixed viewport that never scrolls, so it goes
          back to being ordinary flow there. */}
      <SiteHeader />
      <HomeExperience />
    </LifelineShell>
  )
}
