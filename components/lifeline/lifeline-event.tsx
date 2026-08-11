"use client"

import Link from "next/link"
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react"
import { cn } from "@/lib/utils"
import {
  LifelineLightbox,
  type LifelineLightboxStart,
} from "./lifeline-lightbox"
import type {
  LifelineEvent,
  LifelineEventEffect,
  LifelineEventImage,
  LifelineEventSegment,
} from "./types"

function getEventContent(
  event: LifelineEvent,
): string | LifelineEventSegment[] {
  if (typeof event === "object" && !Array.isArray(event) && "text" in event) {
    return event.text
  }

  return event
}

export function getLifelineEventImage(
  event: LifelineEvent,
): LifelineEventImage | undefined {
  if (typeof event === "object" && !Array.isArray(event) && "image" in event) {
    return event.image
  }

  return undefined
}

export function getLifelineEventEffect(
  event: LifelineEvent,
): LifelineEventEffect | undefined {
  if (typeof event === "object" && !Array.isArray(event) && "effect" in event) {
    return event.effect
  }

  return undefined
}

function getEventTitle(event: LifelineEvent): string | undefined {
  if (typeof event === "object" && !Array.isArray(event) && "title" in event) {
    return event.title
  }

  return undefined
}

function getEventLink(event: LifelineEvent) {
  if (typeof event === "object" && !Array.isArray(event) && "link" in event) {
    return event.link
  }

  return undefined
}

/** The black headline above an event's gray description. */
function LifelineEventTitle({ title }: { title: string }) {
  return (
    <span className="mb-1 block font-medium text-black dark:text-white">
      {title}
    </span>
  )
}

/**
 * The milestone's call to action, on its own line under the description.
 * Black and underlined at rest so it reads as a link against the gray
 * copy, Notion blue on hover.
 */
function LifelineEventLink({ label, href }: { label: string; href: string }) {
  // A study lives on this site — sending it to a new tab would strand the
  // reader with two copies of the portfolio open.
  const isExternal = /^https?:\/\//.test(href)

  const className =
    "mt-2 inline-block font-medium text-black underline decoration-black/40 underline-offset-2 transition-colors duration-200 hover:text-notion-blue hover:decoration-notion-blue dark:text-white dark:decoration-white/40"

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </a>
    )
  }

  // Client navigation keeps the root audio element alive long enough for the
  // interaction sound to be heard as the case study route comes in.
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}

export function LifelineEventText({
  event,
  className,
}: {
  event: LifelineEvent
  className?: string
}) {
  const content = getEventContent(event)
  const title = getEventTitle(event)
  const link = getEventLink(event)

  if (typeof content === "string") {
    return (
      <span className={className}>
        {title && <LifelineEventTitle title={title} />}
        {content}
        {link && (
          <span className="block">
            <LifelineEventLink {...link} />
          </span>
        )}
      </span>
    )
  }

  return (
    <span className={className}>
      {title && <LifelineEventTitle title={title} />}
      {content.map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-zinc-400 underline-offset-2 transition-colors duration-300 group-hover:text-black group-hover:decoration-zinc-600 dark:decoration-zinc-700 dark:group-hover:text-white dark:group-hover:decoration-zinc-400"
          >
            {segment.value}
          </a>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
      {link && (
        <span className="block">
          <LifelineEventLink {...link} />
        </span>
      )}
    </span>
  )
}

function stableFrameTilt(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  const magnitude = 2 + (Math.abs(hash) % 6)
  return hash % 2 === 0 ? magnitude : -magnitude
}

/** A persistent, physical-looking photo slot for one milestone. */
export function LifelineMarkerSquare({
  media,
  className,
}: {
  media: Partial<LifelineEventImage>
  className?: string
}) {
  const inputId = useId()
  const storageKey = useMemo(
    () => `lifeline-photo:${media.alt ?? media.src ?? "untitled"}`,
    [media.alt, media.src],
  )
  const tilt = stableFrameTilt(storageKey)
  const [src, setSrc] = useState(media.src)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [pressed, setPressed] = useState(false)
  const [lightboxStart, setLightboxStart] =
    useState<LifelineLightboxStart | null>(null)
  const [status, setStatus] = useState<"idle" | "uploading" | "error">(
    "idle",
  )
  const frameRef = useRef<HTMLDivElement>(null)
  const drag = useRef({
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    moved: false,
    slop: 4,
  })

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey)
    if (!saved) return
    const timeout = window.setTimeout(() => setSrc(saved), 0)
    return () => window.clearTimeout(timeout)
  }, [storageKey])

  const upload = async (file: File) => {
    setStatus("uploading")
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch("/api/studio/upload", {
        method: "POST",
        body,
      })
      const result = await response.json()
      if (!response.ok || typeof result.src !== "string") {
        throw new Error(result.error ?? "Upload failed")
      }
      setSrc(result.src)
      window.localStorage.setItem(storageKey, result.src)
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }

  const measureFrame = (): LifelineLightboxStart | null => {
    const frame = frameRef.current
    if (!frame) return null
    const rect = frame.getBoundingClientRect()
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      w: frame.offsetWidth,
      h: frame.offsetHeight,
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("input, label")) return
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
      moved: false,
      slop: event.pointerType === "touch" ? 10 : 4,
    }
    setPressed(true)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pressed) return
    const dx = event.clientX - drag.current.startX
    const dy = event.clientY - drag.current.startY
    if (Math.hypot(dx, dy) > drag.current.slop) drag.current.moved = true
    setOffset({ x: drag.current.baseX + dx, y: drag.current.baseY + dy })
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId)
    setPressed(false)
    if (drag.current.moved) {
      setOffset({ x: 0, y: 0 })
      return
    }
    if (src && !drag.current.moved && !lightboxStart) {
      setLightboxStart(measureFrame())
    }
  }

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId)
    setPressed(false)
    setOffset({ x: drag.current.baseX, y: drag.current.baseY })
  }

  return (
    <>
      <div
        ref={frameRef}
        data-lifeline-interactive
        data-click-sound="photo-card"
        data-photo-frame={src ? "filled" : "empty"}
        className={cn(
          "relative mx-auto w-[200px] max-w-[calc(100%-12px)] shrink-0 touch-pan-y cursor-grab",
          pressed
            ? "z-50 cursor-grabbing transition-none"
            : "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          lightboxStart && "invisible",
          className,
        )}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) rotate(${tilt}deg)`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={(event) => {
          if ((event.target as Element).closest("input, label")) return
          event.stopPropagation()
          event.preventDefault()
          if (src && !drag.current.moved && !lightboxStart) {
            setLightboxStart(measureFrame())
          }
        }}
      >
        <div
          className={cn(
            "relative bg-white p-3 pb-12 shadow-[0_14px_28px_-18px_rgba(28,25,23,0.42)] transition-transform duration-150 ease-out dark:bg-white",
            pressed && "scale-[0.96]",
          )}
        >
          <div className="aspect-square overflow-hidden bg-white">
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={media.alt ?? ""}
                draggable={false}
                loading="lazy"
                className="pointer-events-none h-full w-full object-cover"
              />
            )}
          </div>

          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="peer sr-only"
            disabled={status === "uploading"}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
              event.target.value = ""
            }}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "absolute bottom-1 left-1/2 flex min-h-10 -translate-x-1/2 cursor-pointer items-center whitespace-nowrap px-2 text-[11px] font-medium text-zinc-700 underline decoration-zinc-400 underline-offset-2",
              "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black active:translate-y-px",
              status === "uploading" && "pointer-events-none opacity-50",
              status === "error" && "text-red-700 decoration-red-300",
            )}
          >
            {status === "uploading"
              ? "Uploading…"
              : status === "error"
                ? "Try upload again"
                : src
                  ? "Replace photo"
                  : "Upload photo"}
          </label>
          <span className="sr-only" role="status" aria-live="polite">
            {status === "error" ? "Photo upload failed." : ""}
          </span>
        </div>
      </div>

      {lightboxStart && src && (
        <LifelineLightbox
          photo={{ src, alt: media.alt ?? "Timeline photo" }}
          rotate={tilt}
          start={lightboxStart}
          getHome={measureFrame}
          framed
          onClosed={() => setLightboxStart(null)}
        />
      )}
    </>
  )
}

/** Always-visible media embedded in the timeline (image.inline). */
export function LifelineEventMedia({
  media,
  className,
}: {
  media: LifelineEventImage
  className?: string
}) {
  if (media.video) {
    return (
      <video
        src={media.video}
        poster={media.src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={media.alt}
        className={className}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={media.src} alt={media.alt} loading="lazy" className={className} />
  )
}

export function getLifelineEventKey(event: LifelineEvent, index: number) {
  const content = getEventContent(event)

  if (typeof content === "string") return `${index}-${content}`

  return `${index}-${content.map((segment) => segment.value).join("")}`
}
