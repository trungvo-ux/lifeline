"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import type { PointerEvent } from "react"
import type { Study } from "@/lib/study"
import { PortfolioNav } from "@/components/portfolio-nav"
import "./works-gallery.css"

function thumbnail(study: Study) {
  return study.nodes.find((node) => node.type === "image")?.src
}

/** The first four keep the hand-picked order; later studies get a shape seeded by slug, so it stays put across reloads. */
function shapeOf(study: Study, index: number) {
  if (index < 4) return index
  let hash = 0
  for (const char of study.slug) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 4
}

export function WorksGallery({ studies }: { studies: Study[] }) {
  const router = useRouter()
  const [hovered, setHovered] = useState<Study | null>(null)
  const [captionStudy, setCaptionStudy] = useState<Study | null>(null)
  const [captionPhase, setCaptionPhase] = useState("")
  const [pointerHover, setPointerHover] = useState(false)
  const [introReady, setIntroReady] = useState(false)
  const cursor = useRef<HTMLSpanElement>(null)
  const caption = useRef<HTMLDivElement>(null)
  const shownCaption = useRef<Study | null>(null)
  const requestedCaption = useRef<Study | null>(null)
  const captionTimer = useRef<number | null>(null)
  const captionFrame = useRef<number | null>(null)
  const page = useRef<HTMLDivElement>(null)
  const autoPaused = useRef(false)
  const track = useRef<HTMLDivElement>(null)
  const navigating = useRef(false)
  const projects = studies.map((study, index) => ({ study, shape: shapeOf(study, index) }))
  // Three studies get a repeat of the first to fill the four-shape rhythm.
  const sequence = projects.length > 0 && projects.length < 4 ? [...projects, { study: projects[0].study, shape: 3 }] : projects
  const cards = Array.from({ length: 5 }, () => sequence).flat()
  const introCount = cards.length

  useEffect(() => {
    const row = track.current
    if (!row || introCount === 0) return

    const elements = Array.from(row.querySelectorAll<HTMLElement>(".works-card"))
    const center = sequence.length * 2
    const cycle = elements[center + sequence.length].offsetLeft - elements[center].offsetLeft
    const shiftSteps = window.matchMedia("(min-width: 1900px)").matches ? 2 : 1
    const start = -center / sequence.length * cycle
    const edge = parseFloat(getComputedStyle(row).getPropertyValue("--works-edge")) || 16
    const end = edge - row.offsetLeft - elements[center].offsetLeft
    row.style.transform = `translateX(${start}px)`
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      row.style.transform = `translateX(${end}px)`
      return
    }

    const animations: Animation[] = []
    let cancelled = false

    // The first real card arrives in the center, then the row carries it left.
    animations.push(elements[center].animate([
      { opacity: 0, transform: "scale(.78)" },
      { opacity: 1, transform: "scale(1)" },
    ], { duration: 450, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" }))

    animations.push(row.animate([
      { transform: `translateX(${start}px)` },
      { transform: `translateX(${end}px)` },
    ], { delay: 370, duration: 690, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "forwards" }))

    // Each next card arrives on the right after the preceding one.
    for (let index = center + 1; index <= Math.min(center + shiftSteps + 3, elements.length - 1); index++) {
      animations.push(elements[index].animate([
        { opacity: 0, transform: "translateX(-42px) scale(.92)" },
        { opacity: 1, transform: "translateX(0) scale(1)" },
      ], {
        delay: 650 + (index - center - 1) * 175,
        duration: 460,
        easing: "cubic-bezier(.22, 1, .36, 1)",
        fill: "forwards",
      }))
    }

    Promise.all(animations.map((animation) => animation.finished)).then(() => {
      if (cancelled) return
      elements.forEach((element) => { element.style.opacity = "1" })
      row.style.transform = `translateX(${end}px)`
      setIntroReady(true)
      animations.forEach((animation) => animation.cancel())
    }).catch(() => {})

    return () => {
      cancelled = true
      animations.forEach((animation) => animation.cancel())
      elements.forEach((element) => { element.style.opacity = "" })
      row.style.transform = ""
    }
  }, [introCount, sequence.length])

  useEffect(() => {
    const row = track.current
    const surface = page.current
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!row || !surface || (!introReady && !reducedMotion) || sequence.length === 0) return

    const elements = Array.from(row.querySelectorAll<HTMLElement>(".works-card"))
    const center = sequence.length * 2
    let cycle = elements[center + sequence.length].offsetLeft - elements[center].offsetLeft
    const edge = parseFloat(getComputedStyle(row).getPropertyValue("--works-edge")) || 16
    let base = edge - row.offsetLeft - elements[center].offsetLeft
    let current = base
    let target = base
    let previous = performance.now()
    let frame = 0
    row.style.transform = `translate3d(${base}px, 0, 0)`

    // No hover on touch screens, so the caption follows whichever card is centered.
    const touchOnly = window.matchMedia("(hover: none)").matches
    let lastCheck = 0
    let centered = -1
    function captionCentered(now: number) {
      if (now - lastCheck < 120) return
      lastCheck = now
      const middle = window.innerWidth / 2
      let best = -1
      let bestDistance = Infinity
      elements.forEach((element, index) => {
        const box = element.getBoundingClientRect()
        const distance = Math.abs(box.left + box.width / 2 - middle)
        if (distance < bestDistance) { bestDistance = distance; best = index }
      })
      if (best !== centered) { centered = best; changeCaption(cards[best]?.study ?? null) }
    }

    function move(now: number) {
      const elapsed = Math.min(now - previous, 48)
      previous = now
      if (touchOnly) captionCentered(now)
      if (!autoPaused.current && !reducedMotion) target -= cycle * elapsed / 38000
      while (target < base - cycle) { target += cycle; current += cycle }
      while (target > base) { target -= cycle; current -= cycle }
      current += (target - current) * Math.min(1, elapsed * .02)
      row!.style.transform = `translate3d(${current}px, 0, 0)`
      frame = requestAnimationFrame(move)
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      target -= delta * unit * .9
    }

    // Drag (touch, pen or mouse): the row follows the finger 1:1, then flings with the release velocity.
    let dragX: number | null = null
    let dragId = -1
    let velocity = 0
    let lastMove = 0
    let dragged = false
    function onDown(event: globalThis.PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return
      dragX = event.clientX
      dragId = event.pointerId
      velocity = 0
      lastMove = event.timeStamp
      dragged = false
      autoPaused.current = true
    }
    function onDragMove(event: globalThis.PointerEvent) {
      if (dragX === null || event.pointerId !== dragId) return
      const dx = event.clientX - dragX
      if (!dragged && Math.abs(dx) < 6) return
      // Capture can throw if the pointer already ended (e.g. a cancelled touch); the drag still works without it.
      if (!dragged) { dragged = true; try { surface!.setPointerCapture(dragId) } catch {} }
      dragX = event.clientX
      target += dx
      current += dx
      const dt = Math.max(1, event.timeStamp - lastMove)
      velocity = velocity * .2 + (dx / dt) * .8
      lastMove = event.timeStamp
    }
    function onUp(event: globalThis.PointerEvent) {
      if (dragX === null || event.pointerId !== dragId) return
      dragX = null
      if (dragged && event.timeStamp - lastMove < 80) target += velocity * 280
      if (event.pointerType !== "mouse") autoPaused.current = false
    }
    // A drag shouldn't also open the card it started on.
    function onClick(event: MouseEvent) {
      if (dragged) { event.preventDefault(); event.stopPropagation(); dragged = false }
    }

    function onResize() {
      const newCycle = elements[center + sequence.length].offsetLeft - elements[center].offsetLeft
      cycle = newCycle
      base = edge - row!.offsetLeft - elements[center].offsetLeft
      current = base
      target = base
      row!.style.transform = `translate3d(${base}px, 0, 0)`
    }

    surface.addEventListener("wheel", onWheel, { passive: false })
    surface.addEventListener("pointerdown", onDown)
    surface.addEventListener("pointermove", onDragMove)
    surface.addEventListener("pointerup", onUp)
    surface.addEventListener("pointercancel", onUp)
    surface.addEventListener("click", onClick, true)
    window.addEventListener("resize", onResize)
    frame = requestAnimationFrame(move)
    return () => {
      cancelAnimationFrame(frame)
      surface.removeEventListener("wheel", onWheel)
      surface.removeEventListener("pointerdown", onDown)
      surface.removeEventListener("pointermove", onDragMove)
      surface.removeEventListener("pointerup", onUp)
      surface.removeEventListener("pointercancel", onUp)
      surface.removeEventListener("click", onClick, true)
      window.removeEventListener("resize", onResize)
    }
    // `cards` only changes when `sequence.length` does; re-running on every render would restart the row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introReady, sequence.length])

  useEffect(() => () => {
    if (captionTimer.current !== null) window.clearTimeout(captionTimer.current)
    if (captionFrame.current !== null) window.cancelAnimationFrame(captionFrame.current)
  }, [])

  function changeCaption(next: Study | null) {
    requestedCaption.current = next
    if (captionTimer.current !== null) window.clearTimeout(captionTimer.current)
    if (captionFrame.current !== null) window.cancelAnimationFrame(captionFrame.current)
    captionTimer.current = null
    captionFrame.current = null

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownCaption.current = next
      setCaptionStudy(next)
      setCaptionPhase("")
      return
    }

    if (shownCaption.current?.slug === next?.slug) {
      setCaptionPhase("")
      return
    }

    const enter = (study: Study | null) => {
      shownCaption.current = study
      setCaptionStudy(study)
      if (!study) {
        setCaptionPhase("")
        return
      }
      setCaptionPhase("is-enter-start")
      captionFrame.current = window.requestAnimationFrame(() => {
        void caption.current?.offsetHeight
        setCaptionPhase("")
        captionFrame.current = null
      })
    }

    if (!shownCaption.current) {
      enter(next)
      return
    }

    const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--text-swap-dur")) || 150
    setCaptionPhase("is-exit")
    captionTimer.current = window.setTimeout(() => {
      captionTimer.current = null
      enter(requestedCaption.current)
    }, duration)
  }

  function moveCursor(event: PointerEvent<HTMLElement>) {
    if (cursor.current) cursor.current.style.transform = `translate3d(${event.clientX + 16}px, ${event.clientY + 16}px, 0)`
  }

  function openProject(study: Study, element: HTMLElement) {
    if (navigating.current) return
    navigating.current = true
    const url = `/study/${study.slug}`
    const source = element.querySelector("img")
    if (!source || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(url)
      return
    }

    const from = element.getBoundingClientRect()
    const overlay = document.createElement("img")
    overlay.src = source.currentSrc || source.src
    overlay.alt = ""
    overlay.setAttribute("aria-hidden", "true")
    Object.assign(overlay.style, {
      position: "fixed", left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`,
      objectFit: "cover", borderRadius: "32px", zIndex: "1000", pointerEvents: "none",
    })
    document.body.appendChild(overlay)
    setHovered(null)
    router.push(url)

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      observer.disconnect()
      overlay.remove()
    }
    const observer = new MutationObserver(() => {
      const target = document.querySelector<HTMLElement>("[data-study-cover-image]")
      if (!target) return
      observer.disconnect()
      const to = target.getBoundingClientRect()
      target.style.opacity = "0"
      const animation = overlay.animate([
        { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, borderRadius: "32px" },
        { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, borderRadius: "24px" },
      ], { duration: 700, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" })
      animation.finished.then(() => {
        overlay.remove()
        target.style.opacity = ""
        finish()
      }, () => { target.style.opacity = ""; finish() })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    window.setTimeout(finish, 5000)
  }

  return <div className="works-page" data-intro-ready={introReady} ref={page}>
    <PortfolioNav active="works" />
    <main className="works-main">
      <div className="works-viewport" onPointerMove={moveCursor} onPointerLeave={() => { setHovered(null); changeCaption(null); setPointerHover(false); autoPaused.current = false }}>
        <div className="works-track" ref={track}>
          {cards.map(({ study, shape }, index) => <button
            className="works-card"
            data-shape={shape}
            type="button"
            key={`${study.slug}-${index}`}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") { moveCursor(event); setHovered(study); changeCaption(study); setPointerHover(true); autoPaused.current = true } }}
            onFocus={() => { setHovered(study); changeCaption(study); autoPaused.current = true }}
            onBlur={() => { setHovered(null); changeCaption(null); autoPaused.current = false }}
            onClick={(event) => openProject(study, event.currentTarget)}
            aria-label={`View ${study.product} project`}
          >
            {thumbnail(study) ? <Image src={thumbnail(study)!} alt="" fill sizes="370px" unoptimized /> : null}
          </button>)}
        </div>
      </div>
      <div className="works-caption" aria-live="polite"><div className={`t-text-swap ${captionPhase}`} data-visible={Boolean(captionStudy)} ref={caption}><span>{captionStudy?.product}</span><span>{captionStudy?.year}</span></div></div>
    </main>
    <span className="works-cursor" data-visible={Boolean(hovered) && pointerHover} ref={cursor} aria-hidden="true">View project</span>
  </div>
}
