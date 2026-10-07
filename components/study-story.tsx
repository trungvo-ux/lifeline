"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Copy, ExternalLink, Maximize2, Minimize2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Study, StudyAction, StudyImageNode, StudyTextNode } from "@/lib/study"
import "./study-story.css"

type Frame = { id: string; image: StudyImageNode; copy: StudyTextNode[] }

export function getFrames(study: Study): Frame[] {
  const frames: Frame[] = []
  for (const node of study.nodes) {
    if (node.type === "image") frames.push({ id: node.id, image: node, copy: [] })
    else if (frames.length) frames[frames.length - 1].copy.push(node)
  }
  return frames
}

/** Detail slides after the cover. A lone image with no copy is just the cover, so there is nothing to scroll to. */
/** Scroll distance per slide, as a fraction of the viewport. Matches .study-scroll-step. */
const STEP = 0.45

export function getSlides(frames: Frame[]) {
  const visible = frames.filter((frame, index) => index === 0 || frame.image.src || frame.image.srcB)
  return visible.length === 1 && visible[0].copy.length === 0 ? [] : visible
}

function Photo({ image, priority = false }: { image: StudyImageNode; priority?: boolean }) {
  return <div className={`study-photo${image.columns === 2 ? " study-photo--pair" : ""}`}>
    {image.src ? <Image src={image.src} alt={image.alt ?? ""} fill sizes="(max-width: 1100px) calc(100vw - 48px), 640px" priority={priority} unoptimized /> : null}
    {image.columns === 2 && image.srcB ? <Image src={image.srcB} alt={image.alt ?? ""} fill sizes="(max-width: 1100px) calc((100vw - 48px) / 2), 320px" unoptimized /> : null}
  </div>
}

function DetailAction({ action }: { action: StudyAction }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle")
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current) }, [])

  if (!action.label.trim() || (action.kind === "link" && !action.value.trim())) return null

  const icon = action.icon === "copy" ? <Copy size={22} strokeWidth={1.75} aria-hidden="true" />
    : action.icon === "external" ? <ExternalLink size={22} strokeWidth={1.75} aria-hidden="true" />
    : action.icon === "arrow" ? <ArrowRight size={22} strokeWidth={1.75} aria-hidden="true" /> : null
  const content = <>{icon}<span>{status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : action.label}</span></>
  const className = "study-detail-action"
  const style = { backgroundColor: action.backgroundColor, color: action.textColor }
  const font = action.font

  if (action.kind === "link") {
    const external = /^https?:\/\//i.test(action.value)
    const link = <a className={className} data-font={font} style={style} href={action.value} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{content}</a>
    // A .dmg can't install on a phone or tablet; CSS swaps in the disabled note on touch-only devices.
    if (!/\.dmg(\?|$)/i.test(action.value)) return link
    return <>
      <span className="study-detail-action-desktop">{link}</span>
      <button type="button" className={`${className} study-detail-action-unavailable`} data-font={font} disabled>{icon}<span>Only available on Mac</span></button>
    </>
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(action.value || window.location.href)
      setStatus("copied")
    } catch {
      setStatus("failed")
    }
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setStatus("idle"), 2000)
  }
  return <button type="button" className={className} data-font={font} style={style} onClick={copy}>{content}</button>
}

export function StudyStory({ study }: { study: Study }) {
  const frames = useMemo(() => getFrames(study), [study])
  const slides = getSlides(frames)
  const root = useRef<HTMLElement>(null)
  const overlay = useRef<HTMLDialogElement>(null)
  // The iframe only exists while open: unmounting it on close is the one way to silence a cross-origin page.
  // Plays the entrance in reverse, then actually closes the dialog.
  const closeOverlay = () => {
    const dialog = overlay.current
    if (!dialog || dialog.dataset.closing) return
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { dialog.close(); setExpanded(false); setEmbedState("idle"); return }
    dialog.dataset.closing = "true"
    const done = (event: AnimationEvent) => {
      if (event.target !== dialog || event.animationName !== "study-embed-out") return
      dialog.removeEventListener("animationend", done)
      delete dialog.dataset.closing
      dialog.close()
      setExpanded(false)
      setEmbedState("idle")
    }
    dialog.addEventListener("animationend", done)
  }
  const [expanded, setExpanded] = useState(false)
  const [embedState, setEmbedState] = useState<"idle" | "loading" | "ready">("idle")
  const [activeStep, setActiveStep] = useState(0)
  // Phones: which card is flipped to show its story.
  const [openCard, setOpenCard] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const productName = study.client || study.product
  const projectName = study.status
  const visibleMetrics = study.metrics?.filter((metric) => metric.name.trim() && metric.kpi.trim()) ?? []
  const coverInfo = () => <div className="study-cover-info">
    <dl>
      <div><dt>{productName}</dt><dd>{projectName}</dd></div>
      <div><dt>Role</dt><dd>{study.role || "Product Designer"}</dd></div>
      <div><dt>Timeline</dt><dd>{study.year}</dd></div>
    </dl>
    {study.url ? <a className="study-cover-external" href={study.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${productName} website`} onClick={study.embed ? (event) => { event.preventDefault(); setEmbedState("loading"); overlay.current?.showModal() } : undefined}><ExternalLink size={24} strokeWidth={1.75} aria-hidden="true" /></a> : null}
    {visibleMetrics.length ? <div className="study-cover-metrics" aria-label="Project metrics">
      {visibleMetrics.map((metric, index) => <div className="study-cover-metric" key={index}>
        <span className="study-cover-metric-name">{metric.name}</span>
        <strong className="study-cover-metric-kpi">{metric.kpi}</strong>
      </div>)}
    </div> : null}
  </div>

  // Tapping the cover thumbnail scrolls to the first story slide (its copy).
  const openStory = () => scrollTo({ top: innerHeight * STEP, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })

  useEffect(() => {
    const timer = window.setTimeout(() => setLoaded(true), 80)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    let frame = 0
    const update = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!root.current) return
        const progress = -root.current.getBoundingClientRect().top / (innerHeight * STEP)
        setActiveStep(Math.max(0, Math.min(slides.length, Math.round(progress))))
      })
    }
    addEventListener("scroll", update, { passive: true })
    addEventListener("resize", update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener("scroll", update)
      removeEventListener("resize", update)
    }
  }, [slides.length])

  return <main id="main-content" tabIndex={-1} className="study-story" data-loaded={loaded} data-has-metrics={Boolean(visibleMetrics.length)} ref={root}>
    <h1 className="sr-only">{`${productName} ${projectName} case study`}</h1>
    <Link className="study-back" href="/works" aria-label="Back to works"><ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" /></Link>
    <div className="study-stage">
      <section className="study-step study-step--cover" style={{ zIndex: 0 }} data-active={activeStep === 0} aria-hidden={activeStep !== 0} inert={activeStep !== 0}>
        <div className="study-step-left">
          {coverInfo()}
        </div>
        <div className="study-step-right"><div className="study-visual" data-study-cover-image role={slides.length ? "button" : undefined} tabIndex={slides.length ? 0 : undefined} aria-label={slides.length ? `Read the ${productName} story` : undefined} onClick={slides.length ? openStory : undefined} onKeyDown={slides.length ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openStory() } } : undefined}>{frames[0] ? <Photo image={frames[0].image} priority /> : null}</div></div>
      </section>
      {slides.map((frame, index) => <section className={`study-step study-step--detail${index === 0 ? " study-step--first-detail" : ""}`} style={{ zIndex: index + 1 }} data-active={activeStep === index + 1} data-past={activeStep > index + 1} aria-hidden={activeStep !== index + 1} inert={activeStep !== index + 1} key={frame.id}>
        <div className="study-step-left">
          <div className="study-detail-info">
            <div className="study-project-line"><span>{productName}</span><span>{projectName}</span></div>
            {frame.copy.map((node) => <div className="study-copy-block" key={node.id}>
              {node.title ? <h2>{node.title}</h2> : null}
              <p className={node.muted ? "is-muted" : ""}>{node.copy}</p>
              {node.action ? <DetailAction action={node.action} /> : null}
            </div>)}
          </div>
        </div>
        {index > 0 ? <div className="study-step-right">
          <div className="study-visual"><Photo image={frame.image} /></div>
        </div> : null}
      </section>)}
    </div>
    {/* Phones (≤760px): one free-scrolling page of cards, like gabrielbeaugonin.com/project/lightship.
        Tapping a card shows the story behind it; back and link stay pinned at the bottom. */}
    <div className="study-cards">
      <div className="study-cards-head">
        <dl>
          <div><dt>{productName}</dt><dd>{projectName}</dd></div>
          <div><dt>Role</dt><dd>{study.role || "Product Designer"}</dd></div>
          <div><dd>{study.year}</dd></div>
        </dl>
      </div>
      {frames.map((frame, index) => {
        const open = openCard === frame.id
        const hasStory = frame.copy.length > 0
        const title = frame.copy.find((node) => node.title)?.title || "The story"
        // A card with copy swaps to its story; the "Read more" pill on the front says there's more behind it.
        return <section className="study-card" data-open={open} data-flippable={hasStory} style={{ "--card-index": index } as React.CSSProperties} key={frame.id}>
          <div className="study-card-inner">
            <button type="button" className="study-card-face" disabled={!hasStory} aria-hidden={open} inert={open} aria-label={hasStory ? `Read more: ${title}` : undefined} onClick={() => setOpenCard(frame.id)}>
              <div className="study-visual" data-study-cover-image={index === 0 ? true : undefined}><Photo image={frame.image} priority={index === 0} /></div>
              {hasStory ? <span className="study-card-pill" aria-hidden="true">Read more</span> : null}
            </button>
            {hasStory ? <div className="study-card-back" aria-hidden={!open} inert={!open}>
              <div className="study-card-back-copy">
                {frame.copy.map((node) => <div className="study-copy-block" key={node.id}>
                  {node.title ? <h2>{node.title}</h2> : null}
                  <p>{node.copy}</p>
                  {node.action ? <DetailAction action={node.action} /> : null}
                </div>)}
              </div>
              <button type="button" className="study-card-pill study-card-pill--close" aria-label={`Close: ${title}`} onClick={() => setOpenCard(null)}>Close</button>
            </div> : null}
          </div>
        </section>
      })}
      <nav className="study-cards-actions" aria-label="Case study">
        <Link href="/works" aria-label="Back to works"><ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" /></Link>
        {study.url ? <a href={study.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${productName} website`} onClick={study.embed ? (event) => { event.preventDefault(); setEmbedState("loading"); overlay.current?.showModal() } : undefined}><ExternalLink size={24} strokeWidth={1.75} aria-hidden="true" /></a> : null}
      </nav>
    </div>
    <div className="study-scroll-steps" aria-hidden="true">
      {Array.from({ length: slides.length + 1 }, (_, index) => <div id={`study-step-${index}`} className="study-scroll-step" key={index} />)}
    </div>

    {study.embed && study.url ? <dialog className="study-embed" data-expanded={expanded} ref={overlay} aria-label={`${productName} live site`} onCancel={(event) => { event.preventDefault(); closeOverlay() }} onClick={(event) => { if (event.target === event.currentTarget) closeOverlay() }}>
      <div className="study-embed-bar">
        <button type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Exit full screen" : "Full screen"} aria-pressed={expanded}>{expanded ? <Minimize2 size={24} strokeWidth={1.75} aria-hidden="true" /> : <Maximize2 size={24} strokeWidth={1.75} aria-hidden="true" />}</button>
        <button type="button" onClick={closeOverlay} aria-label="Close"><X size={24} strokeWidth={1.75} aria-hidden="true" /></button>
      </div>
      {embedState === "loading" ? <div className="study-embed-loading" role="status" aria-label="Loading live site"><span /></div> : null}
      {embedState !== "idle" ? <iframe src={study.url} title={`${productName} live site`} allow="fullscreen" data-ready={embedState === "ready"} onLoad={() => setEmbedState("ready")} /> : null}
    </dialog> : null}
  </main>
}
