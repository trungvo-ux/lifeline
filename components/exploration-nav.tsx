"use client"

import type { CSSProperties, FocusEvent, PointerEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/trung--vo",
    tooltip: "Connect with me",
  },
  {
    label: "Email",
    href: "mailto:trungvanvo23@gmail.com",
    tooltip: "Send me an email",
  },
  {
    label: "X",
    href: "https://x.com/Panvan23",
    tooltip: "Follow me on X",
  },
]

type Direction = "left" | "right"

export function ExplorationNav({
  explorationActive = false,
  onExplorationClick,
}: {
  explorationActive?: boolean
  onExplorationClick?: () => void
}) {
  const navRef = useRef<HTMLElement>(null)
  const activeIndexRef = useRef<number | null>(null)
  const openRef = useRef(false)
  const swapTimerRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [previousText, setPreviousText] = useState<string | null>(null)
  const [direction, setDirection] = useState<Direction>("right")
  const [isOpen, setIsOpen] = useState(false)
  const [isBridging, setIsBridging] = useState(false)
  const [tooltipX, setTooltipX] = useState(0)
  const [swapKey, setSwapKey] = useState(0)
  const [toggleInitialized, setToggleInitialized] = useState(false)
  const [togglePressed, setTogglePressed] = useState(false)

  function activate(index: number, target: HTMLElement) {
    const nav = navRef.current
    if (!nav) return

    const navRect = nav.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const previousIndex = activeIndexRef.current

    setTooltipX(targetRect.left - navRect.left + targetRect.width / 2)
    setIsBridging(openRef.current)

    if (previousIndex !== null && previousIndex !== index) {
      if (swapTimerRef.current !== null) {
        window.clearTimeout(swapTimerRef.current)
      }

      setPreviousText(socialLinks[previousIndex].tooltip)
      setDirection(index > previousIndex ? "right" : "left")
      setSwapKey((key) => key + 1)
      swapTimerRef.current = window.setTimeout(() => {
        setPreviousText(null)
        swapTimerRef.current = null
      }, 180)
    }

    activeIndexRef.current = index
    openRef.current = true
    setActiveIndex(index)
    setIsOpen(true)
  }

  function closeTooltip() {
    openRef.current = false
    activeIndexRef.current = null
    setIsOpen(false)
    setIsBridging(false)
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closeTooltip()
    }
  }

  function handlePointerEnter(
    event: PointerEvent<HTMLAnchorElement>,
    index: number
  ) {
    activate(index, event.currentTarget)
  }

  const activeLink = socialLinks[activeIndex]
  const tooltipStyle = {
    "--exploration-tooltip-x": `${tooltipX}px`,
  } as CSSProperties

  useEffect(
    () => () => {
      if (swapTimerRef.current !== null) {
        window.clearTimeout(swapTimerRef.current)
      }
    },
    []
  )

  return (
    <nav
      ref={navRef}
      aria-label="Explore Trung's profiles"
      className="exploration-nav mt-5 flex flex-wrap items-center gap-x-4 gap-y-2"
      onPointerLeave={closeTooltip}
      onBlur={handleBlur}
    >
      <button
        type="button"
        role="switch"
        aria-checked={explorationActive}
        aria-label="Exploration"
        onClick={() => {
          setToggleInitialized(true)
          onExplorationClick?.()
        }}
        data-on={explorationActive}
        data-pressed={togglePressed}
        onPointerDown={() => setTogglePressed(true)}
        onPointerUp={() => setTogglePressed(false)}
        onPointerCancel={() => setTogglePressed(false)}
        onPointerLeave={() => setTogglePressed(false)}
        style={{ "--toggle-travel": "100px" } as CSSProperties}
        className={cn(
          "t-toggle group relative isolate h-8 w-[132px] shrink-0 overflow-visible rounded-full border border-black/[0.04] bg-zinc-200 text-[12px] font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-1px_2px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-black dark:border-white/10 dark:bg-zinc-700 dark:focus-visible:outline-white",
          toggleInitialized && "is-init",
          explorationActive &&
            "border-[#30b94f] bg-[#34c759] shadow-[inset_0_1px_1px_rgba(255,255,255,0.32),inset_0_-1px_2px_rgba(0,0,0,0.08)]",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 flex items-center justify-center transition-[left,right] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            explorationActive ? "left-0 right-[30px]" : "left-[30px] right-0",
          )}
        >
          <span
            key={explorationActive ? "un-explore" : "exploration"}
            className={cn(
              "exploration-switch-label whitespace-nowrap text-zinc-600 group-hover:text-black dark:text-zinc-200 dark:group-hover:text-white",
              explorationActive && "text-white group-hover:text-white",
            )}
          >
            {explorationActive ? "Un-Explore" : "Exploration"}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="t-toggle-thumb pointer-events-none absolute left-[3px] top-[3px] z-10 h-6 w-6"
        >
          <span className="t-toggle-glass block h-full w-full rounded-full border border-white/80 bg-white/75 shadow-[0_2px_5px_rgba(0,0,0,0.24),0_0_0_0.5px_rgba(0,0,0,0.08)] backdrop-blur-xl backdrop-saturate-150" />
        </span>
      </button>

      {socialLinks.map((link, index) => (
        <a
          className="exploration-link text-black underline decoration-black/30 underline-offset-4 transition-colors hover:decoration-black focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 dark:text-white dark:decoration-white/30 dark:hover:decoration-white"
          href={link.href}
          aria-describedby="exploration-shared-tooltip"
          target={link.href.startsWith("http") ? "_blank" : undefined}
          rel={link.href.startsWith("http") ? "noreferrer" : undefined}
          key={link.label}
          onPointerEnter={(event) => handlePointerEnter(event, index)}
          onFocus={(event) => activate(index, event.currentTarget)}
        >
          {link.label}
        </a>
      ))}

      <span
        className="t-tt exploration-tooltip"
        id="exploration-shared-tooltip"
        role="tooltip"
        data-open={isOpen}
        data-bridging={isBridging}
        style={tooltipStyle}
      >
        <span className="exploration-tooltip-copy-slot" data-direction={direction}>
          {previousText && (
            <span className="exploration-tooltip-copy is-previous">
              {previousText}
            </span>
          )}
          <span
            className="exploration-tooltip-copy is-current"
            key={`${activeIndex}-${swapKey}`}
          >
            {activeLink.tooltip}
          </span>
        </span>
      </span>
    </nav>
  )
}
