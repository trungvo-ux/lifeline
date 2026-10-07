// Imported from the concrete files rather than the `@/components/lifeline`
// barrel: shadcn rewrites a bare `@/components/<dir>` import to
// `@/components/<dir>/<dir>` on install, which would miss the barrel.
import { Lifeline } from "@/components/lifeline/lifeline"
import { LifelineLegend } from "@/components/lifeline/lifeline-legend"
import {
  LifelineFooter,
  LifelineNav,
  LifelineShell,
  LifelineStage,
} from "@/components/lifeline-shell"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { personalLifeline } from "@/lib/lifeline-personal"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Lifeline — Trung Vo" }

/**
 * A complete Lifeline page.
 *
 * The nav is not decoration — the rail measures its start and end from
 * it, which is what keeps the timeline inset from the viewport instead
 * of running edge to edge. See components/lifeline-shell.tsx.
 *
 * Swap `personalLifeline` for your own data and replace the logo.
 */
export default function LifelinePage() {
  return (
    <LifelineShell>
      <LifelineNav logo={<span className="text-sm font-medium">Lifeline</span>}>
        <ThemeSwitcher />
      </LifelineNav>

      <LifelineStage>
        <h1 className="sr-only">{personalLifeline.name} timeline</h1>
        <Lifeline
          markers={personalLifeline.markers}
          title={personalLifeline.name}
          className="h-full"
        />
      </LifelineStage>

      <LifelineFooter>
        <LifelineLegend />
      </LifelineFooter>
    </LifelineShell>
  )
}
