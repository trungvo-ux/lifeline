import type { Metadata } from "next"
import { getStudies } from "@/lib/study-server"
import { WorksGallery } from "@/components/works-gallery"

export const metadata: Metadata = { title: "Works — Trung Vo", description: "Selected product design work by Trung Vo." }
export const dynamic = "force-dynamic"

export default async function Works() {
  return <WorksGallery studies={await getStudies()} />
}
