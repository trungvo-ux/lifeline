"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2, Upload, X } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import {
  DEFAULT_STATUS_COLOR,
  toSlug,
  type Study,
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
  "w-full rounded-md border border-black/15 bg-white px-2 py-1.5 text-[13px] text-black outline-none focus:border-black/40 dark:border-white/15 dark:bg-zinc-950 dark:text-white dark:focus:border-white/40"
const BUTTON =
  "inline-flex items-center gap-1.5 rounded-md border border-black/15 px-2.5 py-1.5 text-[12px] transition-colors hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"

function nextNodeId(nodes: StudyNode[]) {
  const used = new Set(nodes.map((n) => n.id))
  let i = nodes.length + 1
  while (used.has(`n${i}`)) i += 1
  return `n${i}`
}

/** The schematic on the right: plates as blocks, text as rules. */
function StackPreview({ study }: { study: Study }) {
  return (
    <div className="sticky top-6 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-gray-600 dark:text-zinc-400">
        Stack
      </p>

      <div className="flex flex-col items-center gap-[6px] rounded bg-black/[0.02] p-3 dark:bg-white/5">
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-medium text-black dark:text-white">
            {study.product || "Untitled"}
          </span>
          {study.status ? (
            <span
              className="rounded-full px-1.5 py-0.5 text-[8px] font-medium text-white"
              style={{ backgroundColor: study.statusColor }}
            >
              {study.status}
            </span>
          ) : null}
        </div>

        {study.nodes.map((node) =>
          node.type === "image" ? (
            <div
              key={node.id}
              className={`flex gap-[4px] ${node.wide ? "w-[115%]" : "w-full"}`}
              title={node.wide ? "750px plate" : "Plate"}
            >
              {(node.columns === 2 ? [node.src, node.srcB] : [node.src]).map(
                (src, i) => (
                  <div
                    key={i}
                    className="h-[26px] flex-1 overflow-hidden rounded-[2px] bg-study-surface"
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div key={node.id} className="w-full py-[2px]">
              {node.muted ? null : (
                <div className="mb-[3px] h-[3px] w-1/2 rounded-full bg-black/50 dark:bg-white/50" />
              )}
              <div className="h-[3px] w-3/4 rounded-full bg-black/20 dark:bg-white/20" />
            </div>
          ),
        )}

        {study.nodes.length === 0 ? (
          <p className="py-4 text-[11px] text-gray-500 dark:text-zinc-400">No nodes yet.</p>
        ) : null}
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

export default function Studio() {
  const [studies, setStudies] = useState<Study[] | null>(null)
  const [active, setActive] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/studio")
      .then((r) => r.json())
      .then((d) => setStudies(d.studies))
      .catch(() => setStatus("Could not load content."))
  }, [])

  if (!studies) {
    return (
      <main className="mx-auto max-w-[1100px] px-6 py-16 text-[14px]">
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
          ? { id: nextNodeId(study.nodes), type: "image", wide: true, columns: 1 }
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
        body: JSON.stringify({ studies }),
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
    <main className="mx-auto max-w-[1100px] px-6 py-12 text-[14px]">
      <header className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[20px] font-medium">Studio</h1>
          <p className="mt-1 text-gray-600 dark:text-zinc-400">
            Saves to content/studies.json — development only.
          </p>
        </div>
        <ThemeSwitcher />
      </header>

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
              <span className="text-[12px] text-gray-600 dark:text-zinc-400">
                Badge (empty hides)
              </span>
              <div className="flex items-center gap-2">
                <input
                  className={FIELD}
                  value={study.status}
                  onChange={(e) => updateStudy({ status: e.target.value })}
                />
                <input
                  type="color"
                  aria-label="Badge colour"
                  className="h-[32px] w-[32px] shrink-0 cursor-pointer rounded-md border border-black/15 bg-white p-0.5 dark:border-white/15 dark:bg-zinc-950"
                  value={study.statusColor}
                  onChange={(e) => updateStudy({ statusColor: e.target.value })}
                />
              </div>
            </label>
          </section>

          <ol className="flex flex-col gap-3">
            {study.nodes.map((node, index) => (
              <li
                key={node.id}
                className="rounded-lg border border-black/10 p-3 transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-gray-600 dark:text-zinc-400">
                    {node.type} · {node.id}
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
                      className={FIELD}
                      placeholder="Title (hidden when the caption is gray)"
                      value={node.title ?? ""}
                      onChange={(e) =>
                        updateNode(node.id, { title: e.target.value })
                      }
                    />
                    <textarea
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
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={Boolean(node.wide)}
                          onChange={(e) =>
                            updateNode(node.id, { wide: e.target.checked })
                          }
                        />
                        Wide (750px)
                      </label>
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
            ))}
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
    </main>
  )
}
