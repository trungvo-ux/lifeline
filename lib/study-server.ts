import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Study, StudyLibrary } from "./study"

/**
 * Filesystem access for the study content, kept apart from lib/study.ts
 * so the studio — a client component — can import the types and helpers
 * without Next trying to bundle `node:fs` for the browser.
 */
export const STUDIES_PATH = path.join(process.cwd(), "content", "studies.json")

export async function getStudies(): Promise<Study[]> {
  const raw = await readFile(STUDIES_PATH, "utf8")
  return (JSON.parse(raw) as StudyLibrary).studies
}

export async function getStudy(slug: string): Promise<Study | undefined> {
  return (await getStudies()).find((study) => study.slug === slug)
}
