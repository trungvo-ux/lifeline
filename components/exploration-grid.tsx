"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import type { ExplorationItem } from "@/lib/study"
import { cn } from "@/lib/utils"

interface FrameRect {
  left: number
  top: number
  width: number
  height: number
}

const OVERLAY_FIT = 0.88

function getFrameRect(element: HTMLElement): FrameRect {
  const rect = element.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function getOverlayTarget(start: FrameRect): FrameRect {
  const maxWidth = window.innerWidth * OVERLAY_FIT
  const maxHeight = window.innerHeight * OVERLAY_FIT
  const aspect = start.width / start.height
  const width = Math.min(maxWidth, maxHeight * aspect)
  const height = width / aspect

  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height,
  }
}

function getCssDuration(name: string, fallback: number) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  if (value.endsWith("ms")) return Number.parseFloat(value) || fallback
  if (value.endsWith("s")) return (Number.parseFloat(value) || 0) * 1000
  return fallback
}

function ExplorationMedia({
  item,
  overlay = false,
}: {
  item: ExplorationItem
  overlay?: boolean
}) {
  if (!item.src) return null

  if (item.kind === "video") {
    return (
      <video
        src={item.src}
        muted={!overlay}
        controls={overlay}
        autoPlay={overlay}
        loop={!overlay}
        playsInline
        preload={overlay ? "auto" : "metadata"}
        aria-label={item.alt || item.title || "Exploration video"}
        className={cn(
          "block h-full w-full bg-black",
          overlay ? "object-contain" : "object-cover",
        )}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.src}
      alt={item.alt}
      className={cn(
        "block h-full w-full",
        overlay ? "object-contain" : "object-cover",
      )}
    />
  )
}

function ExplorationOverlay({
  item,
  start,
  getHome,
  onClosed,
}: {
  item: ExplorationItem
  start: FrameRect
  getHome: () => FrameRect | null
  onClosed: () => void
}) {
  const [target] = useState(() => getOverlayTarget(start))
  const [reducedMotion] = useState(
    () =>
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)
  const [entered, setEntered] = useState(reducedMotion)
  const [closing, setClosing] = useState(false)
  const [home, setHome] = useState(start)

  const toTransform = useCallback(
    (rect: FrameRect) =>
      `translate(${rect.left + rect.width / 2 - (target.left + target.width / 2)}px, ${
        rect.top + rect.height / 2 - (target.top + target.height / 2)
      }px) scale(${rect.width / target.width}, ${rect.height / target.height})`,
    [target],
  )

  useLayoutEffect(() => {
    if (reducedMotion) return
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
    }
  }, [reducedMotion])

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true

    if (reducedMotion) {
      onClosed()
      return
    }

    setHome(getHome() ?? start)
    setClosing(true)
    setEntered(false)

    const closeMs = getCssDuration("--modal-close-dur", 150)
    closeTimerRef.current = window.setTimeout(onClosed, closeMs + 80)
  }, [getHome, onClosed, reducedMotion, start])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    rootRef.current?.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [dismiss])

  return createPortal(
    <div
      ref={rootRef}
      className={cn(
        "exploration-overlay fixed inset-0 z-[999] touch-none overscroll-contain",
        entered && "is-open",
        closing && "is-closing",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={item.title || item.alt || "Exploration media"}
      tabIndex={-1}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Close exploration media"
        className="exploration-overlay-backdrop absolute inset-0 cursor-zoom-out bg-black/80"
        onClick={dismiss}
      />

      <figure
        className="exploration-overlay-frame absolute overflow-hidden bg-black shadow-2xl ring-1 ring-white/15"
        style={{
          left: target.left,
          top: target.top,
          width: target.width,
          height: target.height,
          transform: entered ? "translate(0, 0) scale(1)" : toTransform(home),
        }}
        onTransitionEnd={(event) => {
          if (event.propertyName === "transform" && closingRef.current) {
            onClosed()
          }
        }}
      >
        <div
          className={cn(
            "t-modal h-full w-full overflow-hidden",
            entered && "is-open",
            closing && "is-closing",
          )}
        >
          <ExplorationMedia item={item} overlay />
        </div>
      </figure>

      <button
        type="button"
        aria-label="Close exploration media"
        onClick={dismiss}
        className={cn(
          "t-modal absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          entered && "is-open",
          closing && "is-closing",
        )}
      >
        <X className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>,
    document.body,
  )
}

export function ExplorationGrid({ items }: { items: ExplorationItem[] }) {
  const frameRefs = useRef(new Map<string, HTMLButtonElement>())
  const [active, setActive] = useState<{
    item: ExplorationItem
    start: FrameRect
  } | null>(null)

  return (
    <>
      <section
        aria-label="Exploration projects"
        className="exploration-grid mx-auto grid w-full max-w-[656px] grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-2 sm:gap-5 sm:px-6 lg:px-0"
      >
        {items.map((item, index) => {
          const commonClass =
            "exploration-grid-tile aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900 sm:aspect-[4/3]"

          if (!item.src) {
            return (
              <div
                key={item.id}
                className={commonClass}
                style={{ animationDelay: `${index * 55}ms` }}
                aria-hidden="true"
              />
            )
          }

          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) frameRefs.current.set(item.id, node)
                else frameRefs.current.delete(item.id)
              }}
              type="button"
              aria-label={`Open ${item.title || item.alt || `exploration ${index + 1}`}`}
              className={cn(
                commonClass,
                "cursor-zoom-in text-left outline-none transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 dark:focus-visible:ring-white dark:focus-visible:ring-offset-black",
                active?.item.id === item.id && "opacity-0",
              )}
              style={{ animationDelay: `${index * 55}ms` }}
              onClick={(event) =>
                setActive({ item, start: getFrameRect(event.currentTarget) })
              }
            >
              <ExplorationMedia item={item} />
            </button>
          )
        })}
      </section>

      {active ? (
        <ExplorationOverlay
          item={active.item}
          start={active.start}
          getHome={() => {
            const frame = frameRefs.current.get(active.item.id)
            return frame ? getFrameRect(frame) : null
          }}
          onClosed={() => {
            const frame = frameRefs.current.get(active.item.id)
            setActive(null)
            window.requestAnimationFrame(() => frame?.focus())
          }}
        />
      ) : null}
    </>
  )
}
