/**
 * Case study content, as data rather than JSX.
 *
 * Two node types, matching the two things a study page is actually made
 * of: an image container, and a title-and-copy pair. `muted` is the
 * switch that turns a text node into the small gray caption used under a
 * plate.
 *
 * The file is read per request rather than imported, so saving from
 * /studio shows up on the next reload without a rebuild.
 */
export interface StudyImageNode {
  id: string
  type: "image"
  /** Bleeds 1.3x past the column on desktop. */
  wide?: boolean
  /** 2 renders the side-by-side pair. */
  columns?: 1 | 2
  /** Public path or URL. Empty leaves the gray placeholder plate. */
  src?: string
  /** The right-hand image when `columns` is 2. */
  srcB?: string
  alt?: string
}

export interface StudyTextNode {
  id: string
  type: "text"
  title?: string
  copy: string
  /** The gray caption treatment — smaller, lighter, no title. */
  muted?: boolean
  action?: StudyAction
}

export interface StudyAction {
  kind: "copy" | "link"
  label: string
  /** Empty copies the current page URL for a copy action. */
  value: string
  backgroundColor: string
  textColor: string
  font: "inter" | "mono" | "serif"
  icon: "copy" | "external" | "arrow" | "none"
}

export type StudyNode = StudyImageNode | StudyTextNode

export interface StudyMetric {
  name: string
  kpi: string
}

export interface Study {
  /** The URL segment: /study/<slug>. */
  slug: string
  product: string
  year: string
  /** Empty hides the badge. */
  status: string
  statusColor: string
  /** Cover title; falls back to `product`. */
  client?: string
  /** Falls back to "Product Designer". */
  role?: string
  /** Shows the external-link button on the cover. */
  url?: string
  /** Opens `url` in an in-page iframe overlay instead of a new tab. */
  embed?: boolean
  /** Optional name and KPI cards below the cover details. */
  metrics?: StudyMetric[]
  nodes: StudyNode[]
}

export interface ExplorationItem {
  id: string
  /** Optional label used by the CMS and overlay dialog. */
  title: string
  /** Public path or URL. Empty keeps the placeholder frame. */
  src?: string
  alt: string
  kind: "image" | "video"
}

export interface StudyLibrary {
  studies: Study[]
  exploration: ExplorationItem[]
}

export const DEFAULT_STATUS_COLOR = "#0072f5"

/** Lowercase, hyphenated, URL-safe. Used when a new study is created. */
export function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const HEX = /^#[0-9a-fA-F]{6}$/

/** Rejects anything the page could not render, before it reaches disk. */
export function parseStudyLibrary(value: unknown): StudyLibrary {
  if (typeof value !== "object" || value === null) {
    throw new Error("Content must be an object")
  }

  const { studies, exploration = [] } = value as Record<string, unknown>
  if (!Array.isArray(studies)) throw new Error("`studies` must be an array")
  if (!Array.isArray(exploration)) {
    throw new Error("`exploration` must be an array")
  }

  const seen = new Set<string>()

  const parsed = studies.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`Study ${index} must be an object`)
    }

    const s = entry as Record<string, unknown>
    const label = typeof s.product === "string" ? s.product : `Study ${index}`

    if (typeof s.slug !== "string" || s.slug === "") {
      throw new Error(`${label} needs a slug`)
    }
    if (s.slug !== toSlug(s.slug)) {
      throw new Error(`"${s.slug}" is not a valid slug`)
    }
    // Two studies on one URL would make the second unreachable.
    if (seen.has(s.slug)) throw new Error(`Duplicate slug "${s.slug}"`)
    seen.add(s.slug)

    if (typeof s.product !== "string") throw new Error(`${label}: bad product`)
    if (typeof s.year !== "string") throw new Error(`${label}: bad year`)
    if (typeof s.status !== "string") throw new Error(`${label}: bad status`)
    if (!Array.isArray(s.nodes)) throw new Error(`${label}: bad nodes`)
    if (s.metrics !== undefined && !Array.isArray(s.metrics)) throw new Error(`${label}: bad metrics`)

    const metrics = (s.metrics as unknown[] | undefined)?.map((entry, metricIndex) => {
      if (typeof entry !== "object" || entry === null) {
        throw new Error(`${label}: metric ${metricIndex} must be an object`)
      }
      const metric = entry as Record<string, unknown>
      if (typeof metric.name !== "string" || typeof metric.kpi !== "string") {
        throw new Error(`${label}: metric ${metricIndex} needs a name and KPI`)
      }
      return { name: metric.name, kpi: metric.kpi } satisfies StudyMetric
    })

    const statusColor =
      typeof s.statusColor === "string" && HEX.test(s.statusColor)
        ? s.statusColor
        : DEFAULT_STATUS_COLOR

    const nodes = s.nodes.map((node, nodeIndex) => {
      if (typeof node !== "object" || node === null) {
        throw new Error(`${label}: node ${nodeIndex} must be an object`)
      }

      const n = node as Record<string, unknown>
      if (typeof n.id !== "string" || n.id === "") {
        throw new Error(`${label}: node ${nodeIndex} needs an id`)
      }

      if (n.type === "image") {
        const str = (v: unknown) => (typeof v === "string" && v ? v : undefined)
        return {
          id: n.id,
          type: "image",
          wide: Boolean(n.wide),
          columns: n.columns === 2 ? 2 : 1,
          ...(str(n.src) ? { src: str(n.src) } : {}),
          ...(str(n.srcB) ? { srcB: str(n.srcB) } : {}),
          ...(str(n.alt) ? { alt: str(n.alt) } : {}),
        } satisfies StudyImageNode
      }

      if (n.type === "text") {
        if (typeof n.copy !== "string") {
          throw new Error(`${label}: node ${nodeIndex} needs \`copy\``)
        }
        let action: StudyAction | undefined
        if (n.action !== undefined) {
          if (typeof n.action !== "object" || n.action === null) {
            throw new Error(`${label}: node ${nodeIndex} has a bad action`)
          }
          const a = n.action as Record<string, unknown>
          if (a.kind !== "copy" && a.kind !== "link") {
            throw new Error(`${label}: node ${nodeIndex} needs a copy or link action`)
          }
          if (typeof a.label !== "string" || typeof a.value !== "string") {
            throw new Error(`${label}: node ${nodeIndex} action needs a label and value`)
          }
          const target = a.value.trim()
          if (a.kind === "link" && target && !/^(https?:\/\/|\/(?!\/))/i.test(target)) {
            throw new Error(`${label}: node ${nodeIndex} action link must be a page path or http(s) URL`)
          }
          action = {
            kind: a.kind,
            label: a.label,
            value: a.value,
            backgroundColor: typeof a.backgroundColor === "string" && HEX.test(a.backgroundColor) ? a.backgroundColor : "#111111",
            textColor: typeof a.textColor === "string" && HEX.test(a.textColor) ? a.textColor : "#ffffff",
            font: a.font === "mono" || a.font === "serif" ? a.font : "inter",
            icon: a.icon === "external" || a.icon === "arrow" || a.icon === "none" ? a.icon : "copy",
          }
        }
        return {
          id: n.id,
          type: "text",
          ...(typeof n.title === "string" && n.title !== ""
            ? { title: n.title }
            : {}),
          copy: n.copy,
          muted: Boolean(n.muted),
          ...(action ? { action } : {}),
        } satisfies StudyTextNode
      }

      throw new Error(`${label}: node ${nodeIndex} has an unknown type`)
    })

    return {
      slug: s.slug,
      product: s.product,
      year: s.year,
      status: s.status,
      statusColor,
      ...(typeof s.client === "string" && s.client ? { client: s.client } : {}),
      ...(typeof s.role === "string" && s.role ? { role: s.role } : {}),
      // Bare domains ("lookbook.dev") get https:// so the cover link still works.
      ...(typeof s.url === "string" && s.url.trim()
        ? { url: /^https?:\/\//.test(s.url.trim()) ? s.url.trim() : `https://${s.url.trim()}` }
        : {}),
      ...(s.embed === true ? { embed: true } : {}),
      ...(metrics?.length ? { metrics } : {}),
      nodes,
    } satisfies Study
  })

  const explorationIds = new Set<string>()
  const parsedExploration = exploration.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`Exploration frame ${index} must be an object`)
    }

    const item = entry as Record<string, unknown>
    if (typeof item.id !== "string" || item.id === "") {
      throw new Error(`Exploration frame ${index} needs an id`)
    }
    if (explorationIds.has(item.id)) {
      throw new Error(`Duplicate exploration id "${item.id}"`)
    }
    explorationIds.add(item.id)

    const stringValue = (input: unknown) =>
      typeof input === "string" ? input : ""

    return {
      id: item.id,
      title: stringValue(item.title),
      ...(stringValue(item.src) ? { src: stringValue(item.src) } : {}),
      alt: stringValue(item.alt),
      kind: item.kind === "video" ? "video" : "image",
    } satisfies ExplorationItem
  })

  return { studies: parsed, exploration: parsedExploration }
}
