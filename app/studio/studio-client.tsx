"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2, Upload, X } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { getFrames, getSlides } from "@/components/study-story"
import {
  DEFAULT_STATUS_COLOR,
  toSlug,
  type ExplorationItem,
  type Study,
  type StudyAction,
  type StudyNode,
} from "@/lib/study"

/**
 * The behind-the-scenes editor.
 *
 * Deliberately plain — it is a tool, not a page. The left column lists
 * every node the study renders with the fields that drive it; the right
 * column is a live schematic of the stack, so the page's rhythm is
 * readable without scrolling the form.
 *
 * Saving writes content/studies.json through /api/studio, which only
 * accepts writes in development.
 */

const FIELD =
  "w-full rounded-md border border-black/15 bg-white px-2 py-1.5 text-[13px] text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
const BUTTON =
  "inline-flex items-center gap-1.5 rounded-md border border-black/15 px-2.5 py-1.5 text-[12px] transition-colors hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"

function nextNodeId(nodes: StudyNode[]) {
  const used = new Set(nodes.map((n) => n.id))
  let i = nodes.length + 1
  while (used.has(`n${i}`)) i += 1
  return `n${i}`
}

function nextExplorationId(items: ExplorationItem[]) {
  const used = new Set(items.map((item) => item.id))
  let index = items.length + 1
  while (used.has(`e${index}`)) index += 1
  return `e${index}`
}

/** Mini slides mirroring /study: a cover, then one slide per image with the copy that follows it. */
function StackPreview({ study }: { study: Study }) {
  const frames = getFrames(study)
  const name = study.client || study.product || "Untitled"
  return (
    <div className="sticky top-6 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-gray-600 dark:text-zinc-400">
        Slides
      </p>

      <div className="flex flex-col gap-2">
        {frames.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-gray-500 dark:text-zinc-400">Add an image to start a slide.</p>
        ) : null}
        {[null, ...getSlides(frames)].map((frame, index) => {
          const image = frame ? frame.image : frames[0]?.image
          const showImage = index !== 1
          return (
            <div
              key={frame?.image.id ?? "cover"}
              className="relative flex aspect-[16/10] items-center gap-2 rounded-[3px] border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-zinc-950"
            >
              <span className="absolute left-1.5 top-1 text-[8px] text-gray-400">{frame ? `Slide ${index}` : "Cover"}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                {frame ? (
                  <>
                    <p className="truncate text-[6px] text-gray-500 dark:text-zinc-400">{name} {study.status}</p>
                    {frame.copy.map((node) => (
                      <div key={node.id}>
                        {node.title ? <p className="truncate text-[7px] font-medium text-black dark:text-white">{node.title}</p> : null}
                        <div className="mt-[2px] h-[2px] w-full rounded-full bg-black/15 dark:bg-white/20" />
                        <div className="mt-[2px] h-[2px] w-2/3 rounded-full bg-black/15 dark:bg-white/20" />
                        {node.action?.label ? <span className="mt-1 inline-block rounded-[2px] px-1 py-[2px] text-[6px]" style={{ backgroundColor: node.action.backgroundColor, color: node.action.textColor }}>{node.action.label}</span> : null}
                      </div>
                    ))}
                  </>
                ) : (
                  <dl className="text-[7px] leading-[1.3]">
                    {[[name, study.status], ["Role", study.role || "Product Designer"], ["Timeline", study.year]].map(([dt, dd]) => (
                      <div key={dt} className="flex gap-1"><dt className="font-medium text-black dark:text-white">{dt}</dt><dd className="truncate text-gray-500 dark:text-zinc-400">{dd}</dd></div>
                    ))}
                  </dl>
                )}
                {!frame && study.metrics?.length ? <div className="mt-1 space-y-[2px]">
                  {study.metrics.map((metric, metricIndex) => <div key={metricIndex} className="flex justify-between gap-1 rounded-[2px] bg-[#ececef] px-1 py-[2px] text-[6px] text-[#626168]">
                    <span className="truncate">{metric.name}</span><strong className="truncate font-medium">{metric.kpi}</strong>
                  </div>)}
                </div> : null}
              </div>
              {showImage && image ? (
                <div className="flex aspect-[4/3] w-[58%] shrink-0 gap-[2px] overflow-hidden rounded-[2px] bg-study-surface">
                  {(image.columns === 2 ? [image.src, image.srcB] : [image.src]).map((src, i) =>
                    src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" />
                    ) : <div key={i} className="flex-1" />,
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <a
        href={`/study/${study.slug}`}
        className="mt-3 block text-[12px] underline underline-offset-2"
      >
        Open /study/{study.slug}
      </a>
    </div>
  )
}

/** Upload or clear one image slot. */
function ImageSlot({
  label,
  src,
  onChange,
}: {
  label: string
  src?: string
  onChange: (src: string | undefined) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch("/api/studio/upload", { method: "POST", body })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error)
      onChange(json.src)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-[44px] w-[60px] shrink-0 overflow-hidden rounded border border-black/10 bg-study-surface dark:border-white/10">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <input
          aria-label={`${label} URL`}
          className={FIELD}
          placeholder={`${label} — /uploads/… or a URL`}
          value={src ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {error ? <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p> : null}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload(file)
          e.target.value = ""
        }}
      />
      <button
        type="button"
        className={BUTTON}
        onClick={() => input.current?.click()}
        disabled={busy}
      >
        <Upload className="h-3.5 w-3.5" />
        {busy ? "…" : "Upload"}
      </button>
      {src ? (
        <button
          type="button"
          className={BUTTON}
          onClick={() => onChange(undefined)}
          aria-label="Clear image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

function ExplorationMediaSlot({
  item,
  onChange,
}: {
  item: ExplorationItem
  onChange: (patch: Partial<ExplorationItem>) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch("/api/studio/upload", { method: "POST", body })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error)
      onChange({ src: json.src, kind: json.kind === "video" ? "video" : "image" })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="grid h-[72px] w-[96px] shrink-0 place-items-center overflow-hidden rounded bg-study-surface ring-1 ring-black/10 dark:ring-white/10">
        {item.src ? (
          item.kind === "video" ? (
            <video
              src={item.src}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.src} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <span className="text-[10px] uppercase tracking-[0.08em] text-gray-500 dark:text-zinc-500">
            Empty
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex gap-2">
          <input
            aria-label="Media URL"
            className={FIELD}
            placeholder="/uploads/… or a media URL"
            value={item.src ?? ""}
            onChange={(event) =>
              onChange({ src: event.target.value || undefined })
            }
          />
          <select
            aria-label="Media type"
            className={`${FIELD} !w-[92px] shrink-0`}
            value={item.kind}
            onChange={(event) =>
              onChange({ kind: event.target.value === "video" ? "video" : "image" })
            }
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </div>
        {error ? (
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
          event.target.value = ""
        }}
      />
      <button
        type="button"
        className={BUTTON}
        onClick={() => input.current?.click()}
        disabled={busy}
      >
        <Upload className="h-3.5 w-3.5" />
        {busy ? "…" : "Upload"}
      </button>
      {item.src ? (
        <button
          type="button"
          className={BUTTON}
          onClick={() => onChange({ src: undefined })}
          aria-label={`Clear exploration frame ${item.id}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

function ExplorationEditor({
  items,
  onChange,
  onSave,
  saving,
}: {
  items: ExplorationItem[]
  onChange: (items: ExplorationItem[]) => void
  onSave: () => void
  saving: boolean
}) {
  const update = (index: number, patch: Partial<ExplorationItem>) =>
    onChange(items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ))

  const move = (index: number, by: number) => {
    const target = index + by
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <section className="mb-10 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-medium">Exploration</h2>
          <p className="mt-1 text-[12px] text-gray-600 dark:text-zinc-400">
            Media frames on the homepage. Videos play with controls in the overlay.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-black px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {saving ? "Saving…" : "Save exploration"}
        </button>
      </div>

      <ol className="grid gap-3 xl:grid-cols-2">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="rounded-lg border border-black/10 p-3 dark:border-white/10"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-gray-600 dark:text-zinc-400">
                Frame {index + 1} · {item.id}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move frame ${index + 1} up`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label={`Move frame ${index + 1} down`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label={`Delete frame ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <ExplorationMediaSlot
                item={item}
                onChange={(patch) => update(index, patch)}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  aria-label={`Frame ${index + 1} title`}
                  className={FIELD}
                  placeholder="Title / overlay label"
                  value={item.title}
                  onChange={(event) => update(index, { title: event.target.value })}
                />
                <input
                  aria-label={`Frame ${index + 1} alt text`}
                  className={FIELD}
                  placeholder="Alt text"
                  value={item.alt}
                  onChange={(event) => update(index, { alt: event.target.value })}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className={`${BUTTON} mt-3`}
        onClick={() =>
          onChange([
            ...items,
            {
              id: nextExplorationId(items),
              title: "",
              alt: "",
              kind: "image",
            },
          ])
        }
      >
        <Plus className="h-3.5 w-3.5" /> New frame
      </button>
    </section>
  )
}

export default function Studio() {
  const [studies, setStudies] = useState<Study[] | null>(null)
  const [exploration, setExploration] = useState<ExplorationItem[] | null>(null)
  const [workspace, setWorkspace] = useState<"case-studies" | "exploration">(
    "case-studies",
  )
  const [active, setActive] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/studio")
      .then((r) => r.json())
      .then((data) => {
        setStudies(data.studies)
        setExploration(data.exploration ?? [])
      })
      .catch(() => setStatus("Could not load content."))
  }, [])

  if (!studies || !exploration) {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1100px] px-6 py-16 text-[14px]">
        <p className="text-gray-600 dark:text-zinc-400">{status ?? "Loading…"}</p>
      </main>
    )
  }

  const study = studies[active]

  const updateStudy = (patch: Partial<Study>) =>
    setStudies(studies.map((s, i) => (i === active ? { ...s, ...patch } : s)))

  const updateNode = (id: string, patch: Record<string, unknown>) =>
    updateStudy({
      nodes: study.nodes.map((n) =>
        n.id === id ? ({ ...n, ...patch } as StudyNode) : n,
      ),
    })

  const updateAction = (id: string, action: StudyAction, patch: Partial<StudyAction>) =>
    updateNode(id, { action: { ...action, ...patch } })

  const move = (index: number, by: number) => {
    const next = [...study.nodes]
    const target = index + by
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    updateStudy({ nodes: next })
  }

  const addNode = (type: StudyNode["type"]) =>
    updateStudy({
      nodes: [
        ...study.nodes,
        type === "image"
          ? { id: nextNodeId(study.nodes), type: "image", columns: 1 }
          : {
              id: nextNodeId(study.nodes),
              type: "text",
              title: "",
              copy: "",
              muted: false,
            },
      ],
    })

  const addStudy = () => {
    const slugs = new Set(studies.map((s) => s.slug))
    let slug = "new-study"
    let i = 2
    while (slugs.has(slug)) slug = `new-study-${i++}`

    setStudies([
      ...studies,
      {
        slug,
        product: "New study",
        year: `${new Date().getFullYear()}`,
        status: "",
        statusColor: DEFAULT_STATUS_COLOR,
        nodes: [],
      },
    ])
    setActive(studies.length)
  }

  const removeStudy = () => {
    if (studies.length === 1) return
    setStudies(studies.filter((_, i) => i !== active))
    setActive(Math.max(0, active - 1))
  }

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const response = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studies, exploration }),
      })
      const body = await response.json()
      setStatus(response.ok ? "Saved." : `Error: ${body.error}`)
    } catch {
      setStatus("Could not reach the server.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1100px] px-6 py-12 text-[14px]">
      <header className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[20px] font-medium">Studio</h1>
          <p className="mt-1 text-gray-600 dark:text-zinc-400">
            Saves to content/studies.json — development only.
          </p>
        </div>
        <ThemeSwitcher />
      </header>

      <nav
        aria-label="Studio sections"
        className="mb-6 border-b border-black/10 dark:border-white/10"
      >
        <div className="flex gap-6" role="tablist" aria-label="Studio content">
          {(
            [
              ["case-studies", "Case studies"],
              ["exploration", "Exploration"],
            ] as const
          ).map(([id, label]) => {
            const selected = workspace === id

            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`studio-tab-${id}`}
                aria-selected={selected}
                aria-controls={`studio-panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setWorkspace(id)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
                  event.preventDefault()
                  const next = event.key === "ArrowLeft" || event.key === "Home" ? "case-studies" : "exploration"
                  setWorkspace(next)
                  document.getElementById(`studio-tab-${next}`)?.focus()
                }}
                className={`relative pb-3 text-[14px] font-medium transition-colors after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-current after:transition-transform ${
                  selected
                    ? "text-black after:scale-x-100 dark:text-white"
                    : "text-gray-500 after:scale-x-0 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </nav>

      {workspace === "exploration" ? (
        <div
          role="tabpanel"
          id="studio-panel-exploration"
          aria-labelledby="studio-tab-exploration"
        >
          <ExplorationEditor
            items={exploration}
            onChange={setExploration}
            onSave={save}
            saving={saving}
          />
          {status ? (
            <p className="mt-3 text-[13px] text-gray-600 dark:text-zinc-400">
              {status}
            </p>
          ) : null}
        </div>
      ) : (
        <div
          role="tabpanel"
          id="studio-panel-case-studies"
          aria-labelledby="studio-tab-case-studies"
        >

          {/* Study switcher */}
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-black/10 pb-4 dark:border-white/10">
        {studies.map((s, i) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
              i === active
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "border border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            }`}
          >
            {s.product || s.slug}
          </button>
        ))}
        <button type="button" className={BUTTON} onClick={addStudy}>
          <Plus className="h-3.5 w-3.5" /> New study
        </button>
        <button
          type="button"
          className={`${BUTTON} ml-auto`}
          onClick={removeStudy}
          disabled={studies.length === 1}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete study
        </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-gray-600 dark:text-zinc-400">Product</span>
              <input
                className={FIELD}
                value={study.product}
                onChange={(e) => updateStudy({ product: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-gray-600 dark:text-zinc-400">Slug (URL)</span>
              <input
                className={FIELD}
                value={study.slug}
                onChange={(e) => updateStudy({ slug: toSlug(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-gray-600 dark:text-zinc-400">Year</span>
              <input
                className={FIELD}
                value={study.year}
                onChange={(e) => updateStudy({ year: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-gray-600 dark:text-zinc-400">Project</span>
              <input
                className={FIELD}
                placeholder="Redesign"
                value={study.status ?? ""}
                onChange={(e) => updateStudy({ status: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-gray-600 dark:text-zinc-400">Client (cover title)</span>
              <input
                className={FIELD}
                placeholder="Defaults to product"
                value={study.client ?? ""}
                onChange={(e) => updateStudy({ client: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-gray-600 dark:text-zinc-400">Role</span>
              <input
                className={FIELD}
                placeholder="Product Designer"
                value={study.role ?? ""}
                onChange={(e) => updateStudy({ role: e.target.value })}
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-gray-600 dark:text-zinc-400">Website</span>
              <input
                aria-label="Website URL"
                className={FIELD}
                placeholder="https://"
                value={study.url ?? ""}
                onChange={(e) => updateStudy({ url: e.target.value })}
              />
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={Boolean(study.embed)}
                  onChange={(e) => updateStudy({ embed: e.target.checked })}
                />
                Open in overlay
              </label>
            </div>
          </section>

          <section className="mb-6 rounded-md border border-black/10 p-3 dark:border-white/10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-medium">Cover metrics</h2>
                <p className="text-[12px] text-gray-600 dark:text-zinc-400">Optional gray cards below the cover details.</p>
              </div>
              <button type="button" className={BUTTON} onClick={() => updateStudy({ metrics: [...(study.metrics ?? []), { name: "", kpi: "" }] })}>
                <Plus className="h-3.5 w-3.5" /> Add metric
              </button>
            </div>
            {study.metrics?.length ? <div className="space-y-2">
              {study.metrics.map((metric, index) => <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2" key={index}>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-gray-600 dark:text-zinc-400">Name</span>
                  <input className={FIELD} placeholder="Metric name" value={metric.name} onChange={(event) => updateStudy({ metrics: study.metrics?.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-gray-600 dark:text-zinc-400">KPI</span>
                  <input className={FIELD} placeholder="e.g. 30%" value={metric.kpi} onChange={(event) => updateStudy({ metrics: study.metrics?.map((item, itemIndex) => itemIndex === index ? { ...item, kpi: event.target.value } : item) })} />
                </label>
                <button type="button" className={`${BUTTON} h-[31px]`} aria-label={`Remove metric ${index + 1}`} onClick={() => updateStudy({ metrics: study.metrics?.filter((_, itemIndex) => itemIndex !== index) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>)}
            </div> : null}
          </section>

          <ol className="flex flex-col gap-3">
            {study.nodes.map((node, index) => {
              const slide = study.nodes.slice(0, index + 1).filter((n) => n.type === "image").length
              return (
              <Fragment key={node.id}>
              {node.type === "image" ? (
                <li className={`${slide > 1 ? "mt-5" : ""} flex items-baseline gap-2 text-[13px] font-medium`}>
                  Slide {slide}
                  <span className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    {slide === 1 ? "Image shows on the cover; copy below shows on the next slide" : "Image + the copy below it"}
                  </span>
                </li>
              ) : null}
              <li
                className={`rounded-lg border p-3 transition-colors ${
                  node.type === "text"
                    ? slide === 0
                      ? "ml-6 border-dashed border-red-400/60"
                      : "ml-6 border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
                    : "border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-gray-600 dark:text-zinc-400">
                    {node.type === "image" ? `Slide ${slide} image` : slide === 0 ? "Hidden — add an image above" : `Slide ${slide} copy`}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className={BUTTON}
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={BUTTON}
                      onClick={() => move(index, 1)}
                      disabled={index === study.nodes.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={BUTTON}
                      onClick={() =>
                        updateStudy({
                          nodes: study.nodes.filter((n) => n.id !== node.id),
                        })
                      }
                      aria-label="Delete node"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {node.type === "text" ? (
                  <div className="flex flex-col gap-2">
                    <input
                      aria-label={`Slide ${slide} title`}
                      className={FIELD}
                      placeholder="Title (hidden when the caption is gray)"
                      value={node.title ?? ""}
                      onChange={(e) =>
                        updateNode(node.id, { title: e.target.value })
                      }
                    />
                    <textarea
                      aria-label={`Slide ${slide} copy`}
                      className={`${FIELD} min-h-[60px] resize-y`}
                      placeholder="Copywriting"
                      value={node.copy}
                      onChange={(e) =>
                        updateNode(node.id, { copy: e.target.value })
                      }
                    />
                    <label className="flex w-fit items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={Boolean(node.muted)}
                        onChange={(e) =>
                          updateNode(node.id, { muted: e.target.checked })
                        }
                      />
                      Gray copywriting
                    </label>
                    {node.action ? <div className="mt-2 grid gap-3 rounded-md border border-black/10 p-3 dark:border-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] font-medium">Button</span>
                        <button type="button" className={BUTTON} onClick={() => updateNode(node.id, { action: undefined })}><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex flex-col gap-1"><span className="text-[12px] text-gray-600 dark:text-zinc-400">Action</span>
                          <select className={FIELD} value={node.action.kind} onChange={(event) => {
                            const kind = event.target.value as StudyAction["kind"]
                            updateAction(node.id, node.action!, { kind, icon: kind === "link" ? "external" : "copy" })
                          }}>
                            <option value="copy">Copy to clipboard</option><option value="link">Open page</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1"><span className="text-[12px] text-gray-600 dark:text-zinc-400">Button text</span>
                          <input className={FIELD} value={node.action.label} onChange={(event) => updateAction(node.id, node.action!, { label: event.target.value })} />
                        </label>
                      </div>
                      <label className="flex flex-col gap-1"><span className="text-[12px] text-gray-600 dark:text-zinc-400">{node.action.kind === "copy" ? "Text or URL to copy (empty copies this page)" : "Page path or https:// URL"}</span>
                        <input className={FIELD} placeholder={node.action.kind === "copy" ? "Current page URL" : "/study/another-project"} value={node.action.value} onChange={(event) => updateAction(node.id, node.action!, { value: event.target.value })} />
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex flex-col gap-1"><span className="text-[12px] text-gray-600 dark:text-zinc-400">Background color</span>
                          <span className="flex gap-2"><input aria-label="Choose background color" type="color" className="h-[32px] w-[40px] cursor-pointer rounded border border-black/15" value={node.action.backgroundColor} onChange={(event) => updateAction(node.id, node.action!, { backgroundColor: event.target.value })} /><input aria-label="Background hex color" className={FIELD} value={node.action.backgroundColor} onChange={(event) => updateAction(node.id, node.action!, { backgroundColor: event.target.value })} /></span>
                        </div>
                        <div className="flex flex-col gap-1"><span className="text-[12px] text-gray-600 dark:text-zinc-400">Text and icon color</span>
                          <span className="flex gap-2"><input aria-label="Choose text and icon color" type="color" className="h-[32px] w-[40px] cursor-pointer rounded border border-black/15" value={node.action.textColor} onChange={(event) => updateAction(node.id, node.action!, { textColor: event.target.value })} /><input aria-label="Text and icon hex color" className={FIELD} value={node.action.textColor} onChange={(event) => updateAction(node.id, node.action!, { textColor: event.target.value })} /></span>
                        </div>
                        <label className="flex flex-col gap-1"><span className="text-[12px] text-gray-600 dark:text-zinc-400">Font</span>
                          <select className={FIELD} value={node.action.font} onChange={(event) => updateAction(node.id, node.action!, { font: event.target.value as StudyAction["font"] })}>
                            <option value="inter">Inter</option><option value="mono">Mono</option><option value="serif">Serif</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1"><span className="text-[12px] text-gray-600 dark:text-zinc-400">Icon</span>
                          <select className={FIELD} value={node.action.icon} onChange={(event) => updateAction(node.id, node.action!, { icon: event.target.value as StudyAction["icon"] })}>
                            <option value="copy">Copy</option><option value="external">External link</option><option value="arrow">Arrow</option><option value="none">None</option>
                          </select>
                        </label>
                      </div>
                    </div> : <button type="button" className={`${BUTTON} mt-2 w-fit`} onClick={() => updateNode(node.id, { action: { kind: "copy", label: "Copy link", value: "", backgroundColor: "#111111", textColor: "#ffffff", font: "inter", icon: "copy" } satisfies StudyAction })}><Plus className="h-3.5 w-3.5" /> Add button</button>}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={node.columns === 2}
                          onChange={(e) =>
                            updateNode(node.id, {
                              columns: e.target.checked ? 2 : 1,
                            })
                          }
                        />
                        Side-by-side pair
                      </label>
                    </div>

                    <ImageSlot
                      label={node.columns === 2 ? "Left image" : "Image"}
                      src={node.src}
                      onChange={(src) => updateNode(node.id, { src })}
                    />
                    {node.columns === 2 ? (
                      <ImageSlot
                        label="Right image"
                        src={node.srcB}
                        onChange={(srcB) => updateNode(node.id, { srcB })}
                      />
                    ) : null}

                    <input
                      aria-label={`Slide ${slide} alt text`}
                      className={FIELD}
                      placeholder="Alt text"
                      value={node.alt ?? ""}
                      onChange={(e) =>
                        updateNode(node.id, { alt: e.target.value })
                      }
                    />
                  </div>
                )}
              </li>
              </Fragment>
              )
            })}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={BUTTON}
              onClick={() => addNode("image")}
            >
              <Plus className="h-3.5 w-3.5" /> Image node
            </button>
            <button
              type="button"
              className={BUTTON}
              onClick={() => addNode("text")}
            >
              <Plus className="h-3.5 w-3.5" /> Text node
            </button>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="ml-auto rounded-md bg-black px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-black"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          {status ? (
            <p className="mt-3 text-[13px] text-gray-600 dark:text-zinc-400">{status}</p>
          ) : null}
        </div>

        <aside>
          <StackPreview study={study} />
        </aside>
          </div>
        </div>
      )}
    </main>
  )
}
