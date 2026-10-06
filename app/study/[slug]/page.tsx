import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { StudyStory } from "@/components/study-story"
import { getStudies, getStudy } from "@/lib/study-server"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const study = await getStudy((await params).slug)
  return {
    title: study ? `${study.product} — Trung Vo` : "Case study — Trung Vo",
    description: study ? `${study.product}, ${study.year}.` : "A closer look at one project, start to shipped.",
  }
}

export async function generateStaticParams() {
  return (await getStudies()).map((study) => ({ slug: study.slug }))
}

export default async function Study({ params }: { params: Promise<{ slug: string }> }) {
  const study = await getStudy((await params).slug)
  if (!study) notFound()
  return <StudyStory study={study} />
}
