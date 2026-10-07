import { notFound } from "next/navigation"
import Studio from "./studio-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Studio — Trung Vo" }

export default function StudioPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  return <Studio />
}
