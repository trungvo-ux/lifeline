import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SITE_GUTTER, SiteHeader } from "@/components/site-header"
import type { StudyNode } from "@/lib/study"
import { getStudies, getStudy } from "@/lib/study-server"
import { cn } from "@/lib/utils"

// Read the content file on every request so edits saved from /studio show
// up on the next reload rather than at the next build.
export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const study = await getStudy((await params).slug)
  return {
    title: study ? `${study.product} — Trung Vo` : "Case study — Trung Vo",
    description: study
      ? `${study.product}, ${study.year}.`
      : "A closer look at one project, start to shipped.",
  }
}

export async function generateStaticParams() {
  return (await getStudies()).map((study) => ({ slug: study.slug }))
}

/**
 * Case study page, from the Portfolio Figma (node 2968:4833).
 *
 * The layout lives here; the words, plate arrangement and imagery live in
 * content/studies.json and are editable at /studio. The design lays
 * everything out absolutely inside a fixed column — this is a normal flow
 * column instead, because absolute positioning cannot reflow for a phone
 * and the reveal animation needs the blocks to be real siblings so
 * `nth-child` can stagger them.
 */

/** A plate: the uploaded image, or the gray placeholder if there is none. */
function Plate({
  src,
  alt,
  className = "",
}: {
  src?: string
  alt?: string
  className?: string
}) {
  // 400px tall on desktop, where the plate is also 750 wide. Below lg it
  // fills the column instead, and 400px against a ~330px width would be
  // taller than it is wide — 200px keeps it landscape on a phone.
  const shape = `h-[200px] shrink-0 overflow-hidden rounded-[4px] lg:h-[400px] ${className}`

  if (!src) return <div className={`${shape} bg-study-surface`} />

  return (
    <div className={`${shape} bg-study-surface`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
    </div>
  )
}

function StudyNodeView({ node }: { node: StudyNode }) {
  if (node.type === "image") {
    // `wide` is the 750px plate, bleeding 75px past each side of the
    // 600px column. Held back to lg, where the 100px page gutter leaves
    // 824px of room; below that it fills the column or it would push the
    // page sideways. Unchecked keeps the plate flush to the column.
    const width = node.wide ? "w-full lg:w-[750px]" : "w-full"

    if (node.columns === 2) {
      return (
        <div className={cn("flex items-center gap-[12px]", width)}>
          <Plate src={node.src} alt={node.alt} className="min-w-0 flex-1" />
          <Plate src={node.srcB} alt={node.alt} className="min-w-0 flex-1" />
        </div>
      )
    }

    return <Plate src={node.src} alt={node.alt} className={width} />
  }

  if (node.muted) {
    return (
      <p className="w-full py-[12px] text-[14px] text-study-caption">
        {node.copy}
      </p>
    )
  }

  return (
    <div className="flex w-full flex-col gap-[4px] py-[12px] text-study-ink">
      {node.title ? (
        <p className="text-[14px] font-medium">{node.title}</p>
      ) : null}
      <p className="text-[14px]">{node.copy}</p>
    </div>
  )
}

export default async function Study({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const study = await getStudy((await params).slug)
  if (!study) notFound()

  return (
    <div className="flex min-h-dvh flex-col bg-white text-foreground transition-colors duration-300 dark:bg-black">
      {/* The same masthead the timeline uses, so moving between the two
          reads as one page changing its content rather than a route swap.
          Deliberately outside `.study-reveal` — it is already on screen
          when you arrive, and holds still while the study settles in. */}
      <SiteHeader />

      <main className={cn("pb-24 pt-[20px]", SITE_GUTTER)}>
        <div className="study-reveal flex w-full max-w-[600px] flex-col items-center gap-[48px] lg:mx-auto">
          <div className="flex w-full items-center justify-between py-[12px]">
            <div className="flex items-center gap-[8px] whitespace-nowrap">
              <p className="text-[20px] font-medium tracking-[-0.2px] text-study-ink">
                {study.product}
              </p>
              <p className="text-[14px] tracking-[-0.14px] text-study-meta">
                {study.year}
              </p>
            </div>

            {study.status ? (
              <div
                className="flex shrink-0 items-center justify-center rounded-[100px] px-[10px] py-[4px]"
                style={{ backgroundColor: study.statusColor }}
              >
                <p className="text-[12px] font-medium tracking-[-0.12px] text-white">
                  {study.status}
                </p>
              </div>
            ) : null}
          </div>

          {study.nodes.map((node) => (
            <StudyNodeView key={node.id} node={node} />
          ))}
        </div>
      </main>
    </div>
  )
}
