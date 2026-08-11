"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * A pill that appears once the reader has gone deep enough to want a way
 * back, and returns them to the top.
 *
 * `afterLabel` names the marker that acts as the trigger — every marker
 * carries its date as an `aria-label`, so "Aug 2025" is enough to find
 * it.
 *
 * This reads position on scroll rather than using an
 * IntersectionObserver: an observer only fires when the element crosses
 * the viewport edge, so a flick that lands well past the marker leaves it
 * "not intersecting" both before and after and never fires at all. The
 * button simply never appeared. One rect read per scroll event is the
 * cheaper mistake.
 *
 * Nothing shows on a viewport that cannot scroll (the desktop timeline in
 * page mode) — the trigger never leaves the top of the screen.
 */
export function ScrollToTop({ afterLabel }: { afterLabel: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const selector = `[aria-label="${CSS.escape(afterLabel)}"]`
    let target: Element | null = null

    const update = () => {
      // Resolved lazily, not once on mount: the Lifeline picks horizontal
      // vs vertical in its own client effect, so on first paint no marker
      // exists yet. Looking it up once here meant binding to null and the
      // button never appearing at all.
      target ??= document.querySelector(selector)
      if (!target) return

      // Above the viewport, not merely out of it — scrolling back up past
      // the marker hides the button again.
      setVisible(target.getBoundingClientRect().top < 0)
    }

    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)

    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [afterLabel])

  return (
    <button
      type="button"
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-[20px] left-1/2 z-50 -translate-x-1/2 rounded-full",
        "border border-black/10 bg-white/90 p-3 text-black shadow-sm backdrop-blur",
        "transition-[opacity,transform] duration-250 ease-out motion-reduce:transition-none",
        "dark:border-white/15 dark:bg-black/90 dark:text-white",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
