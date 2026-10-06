"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ExternalLink, Maximize2, Minimize2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Study, StudyImageNode, StudyTextNode } from "@/lib/study"
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
export function getSlides(frames: Frame[]) {
  return frames.length === 1 && frames[0].copy.length === 0 ? [] : frames
}

function Photo({ image, priority = false }: { image: StudyImageNode; priority?: boolean }) {
  return <div className={`study-photo${image.columns === 2 ? " study-photo--pair" : ""}`}>
    {image.src ? <Image src={image.src} alt={image.alt ?? ""} fill sizes="(max-width: 1100px) calc(100vw - 48px), 640px" priority={priority} unoptimized /> : null}
    {image.columns === 2 && image.srcB ? <Image src={image.srcB} alt={image.alt ?? ""} fill sizes="(max-width: 1100px) calc((100vw - 48px) / 2), 320px" unoptimized /> : null}
  </div>
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
  const [loaded, setLoaded] = useState(false)
  const productName = study.client || study.product
  const projectName = study.status
  const coverInfo = () => <div className="study-cover-info">
    <div className="study-cover-badges"><span aria-hidden="true">{productName.slice(0, 1)}</span>{study.url ? <a className="study-cover-external" href={study.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${productName} website`} onClick={study.embed ? (event) => { event.preventDefault(); setEmbedState("loading"); overlay.current?.showModal() } : undefined}><ExternalLink size={24} strokeWidth={1.75} aria-hidden="true" /></a> : null}</div>
    <dl>
      <div><dt>{productName}</dt><dd>{projectName}</dd></div>
      <div><dt>Role</dt><dd>{study.role || "Product Designer"}</dd></div>
      <div><dt>Timeline</dt><dd>{study.year}</dd></div>
    </dl>
  </div>

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
        const progress = -root.current.getBoundingClientRect().top / innerHeight
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

  return <main className="study-story" data-loaded={loaded} ref={root}>
    <Link className="study-back" href="/works" aria-label="Back to works"><ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" /></Link>
    <div className="study-stage">
      <section className="study-step study-step--cover" style={{ zIndex: 0 }} data-active={activeStep === 0} aria-hidden={activeStep !== 0}>
        <div className="study-step-left">
          {coverInfo()}
        </div>
        <div className="study-step-right"><div className="study-visual" data-study-cover-image>{frames[0] ? <Photo image={frames[0].image} priority /> : null}</div></div>
      </section>
      {slides.map((frame, index) => <section className={`study-step study-step--detail${index === 0 ? " study-step--first-detail" : ""}`} style={{ zIndex: index + 1 }} data-active={activeStep === index + 1} data-past={activeStep > index + 1} aria-hidden={activeStep !== index + 1} key={frame.id}>
        <div className="study-step-left">
          <div className="study-detail-info">
            <div className="study-project-line"><span>{productName}</span><span>{projectName}</span></div>
            {frame.copy.map((node) => <div className="study-copy-block" key={node.id}>
              {node.title ? <h2>{node.title}</h2> : null}
              <p className={node.muted ? "is-muted" : ""}>{node.copy}</p>
            </div>)}
          </div>
        </div>
        {index > 0 ? <div className="study-step-right">
          <div className="study-visual"><Photo image={frame.image} /></div>
        </div> : null}
      </section>)}
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
