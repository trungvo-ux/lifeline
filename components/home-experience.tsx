"use client"

import { useState } from "react"
import { AvailabilityLetter } from "@/components/availability-letter"
import { DemoCompanyIcons } from "@/components/demo-company-icons"
import { ExplorationGrid } from "@/components/exploration-grid"
import { ExplorationNav } from "@/components/exploration-nav"
import { Lifeline } from "@/components/lifeline"
import { LifelineStage } from "@/components/lifeline-shell"
import { ScrollToTop } from "@/components/scroll-to-top"
import { SITE_GUTTER } from "@/components/site-header"
import { trungvoLifeline } from "@/lib/trungvo"

const COLUMN = "max-w-[600px] text-left lg:mx-auto"

export function HomeExperience() {
  const [showExploration, setShowExploration] = useState(false)

  return (
    <>
      <section
        className={`shrink-0 pb-12 text-[14px] lg:pb-[100px] ${SITE_GUTTER}`}
      >
        <div className={`reveal-up ${COLUMN}`}>
          <AvailabilityLetter />

          <p className="mt-6 text-black dark:text-white">
            I&rsquo;m interested in doing micro-interactions &amp; animations
          </p>

          <p className="mt-4 text-gray-700 dark:text-zinc-400">
            I design systems for complex data work, currently at IBM on
            watsonx.data, focusing on how teams query, visualize, and act on
            data at scale. I&rsquo;m curious about how AI can enhance humanity
            and how to implement safeguards for it.
          </p>

          <ExplorationNav
            explorationActive={showExploration}
            onExplorationClick={() => setShowExploration((active) => !active)}
          />
        </div>
      </section>

      {showExploration ? (
        <main className="min-h-0 flex-1 pb-12 lg:overflow-y-auto">
          <ExplorationGrid />
        </main>
      ) : (
        <>
          <DemoCompanyIcons />
          <LifelineStage className="reveal-up-last pt-0">
            <Lifeline
              markers={trungvoLifeline.markers}
              title={trungvoLifeline.name}
              className="h-full"
            />
          </LifelineStage>
          <ScrollToTop afterLabel="Aug 2025" />
        </>
      )}
    </>
  )
}
