import Link from "next/link"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { cn } from "@/lib/utils"

/**
 * The name and role, shared by every route.
 *
 * It is the one thing that never changes between the timeline and a case
 * study, which is what makes them read as one page rather than two: the
 * masthead holds still and the content swaps underneath it. On the study
 * route that also means it must not be part of the reveal animation —
 * keep it outside `.study-reveal`.
 *
 * Sticky below lg, where the page itself scrolls. Desktop is a fixed
 * viewport on the timeline, so it reverts to ordinary flow there.
 */
/**
 * Symmetric on phone and tablet. It used to run 52px on the left to line
 * up with where the vertical timeline's dates sit (24px list inset + the
 * rail column + its gap), but that reads as a lopsided margin on every
 * page — and on a case study, which has no rail, it bought nothing.
 */
export const SITE_GUTTER = "px-6 lg:px-[100px]"

export function SiteHeader({
  /** Match the column width of whatever this sits above, so the two share a left edge. */
  columnClassName = "max-w-[600px]",
}: {
  columnClassName?: string
}) {
  return (
    <div
      className={cn(
        "mobile-masthead-fade sticky top-0 z-40 shrink-0 bg-white pb-3 pt-[50px] text-[14px] dark:bg-black lg:static lg:pb-0",
        SITE_GUTTER,
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-6 text-left lg:mx-auto",
          columnClassName,
        )}
      >
        {/* The way back to the timeline from a case study. Block-level so
            the role is part of the target too — the pair reads as one
            masthead, so it should behave as one. */}
        <Link
          href="/"
          aria-label="Trung Vo — home"
          className="inline-block transition-opacity duration-200 hover:opacity-70"
        >
          <span className="block text-[16px] font-medium tracking-[-0.16px] text-black dark:text-white">
            Trung Vo
          </span>
          <span className="block text-gray-600 dark:text-zinc-400">
            Design Engineer
          </span>
        </Link>
        <ThemeSwitcher />
      </div>
    </div>
  )
}
