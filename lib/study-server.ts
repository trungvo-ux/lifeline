import { readFile } from "node:fs/promises"
import path from "node:path"
import type { ExplorationItem, Study, StudyLibrary } from "./study"

/**
 * Filesystem access for the study content, kept apart from lib/study.ts
 * so the studio — a client component — can import the types and helpers
 * without Next trying to bundle `node:fs` for the browser.
 */
export const STUDIES_PATH = path.join(process.cwd(), "content", "studies.json")

export async function getStudyLibrary(): Promise<StudyLibrary> {
  const raw = await readFile(STUDIES_PATH, "utf8")
  const library = JSON.parse(raw) as Partial<StudyLibrary>
  return {
    studies: library.studies ?? [],
    exploration: library.exploration ?? [],
  }
}

export async function getStudies(): Promise<Study[]> {
  return (await getStudyLibrary()).studies
}

export async function getExploration(): Promise<ExplorationItem[]> {
  return (await getStudyLibrary()).exploration
}

export async function getStudy(slug: string): Promise<Study | undefined> {
  return (await getStudies()).find((study) => study.slug === slug)
}
