import { writeFile } from "node:fs/promises"
import { NextResponse } from "next/server"
import { parseStudyLibrary } from "@/lib/study"
import { getStudies, STUDIES_PATH } from "@/lib/study-server"

/**
 * The studio's save endpoint. It writes content/studies.json on the local
 * filesystem, which only makes sense while running `next dev` — a
 * deployed build has a read-only filesystem, and an open write endpoint
 * in production would let anyone rewrite the site. Hence the hard guard.
 */
export const isEditable = process.env.NODE_ENV === "development"

export async function GET() {
  if (!isEditable) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.json({ studies: await getStudies(), editable: isEditable })
}

export async function POST(request: Request) {
  if (!isEditable) {
    return new NextResponse(null, { status: 404 })
  }

  let library
  try {
    library = parseStudyLibrary(await request.json())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid content" },
      { status: 400 },
    )
  }

  await writeFile(STUDIES_PATH, `${JSON.stringify(library, null, 2)}\n`)

  return NextResponse.json({ ok: true })
}
