import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

/**
 * Writes uploaded exploration/study media into public/uploads and hands back its public
 * path. Development only, for the same reason the save endpoint is: a
 * deployed build has a read-only filesystem, and an open upload endpoint
 * is an obvious way to get arbitrary files onto a host.
 */
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads")
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_VIDEO_BYTES = 40 * 1024 * 1024

const MEDIA_TYPES: Record<string, { extension: string; kind: "image" | "video" }> = {
  "image/png": { extension: "png", kind: "image" },
  "image/jpeg": { extension: "jpg", kind: "image" },
  "image/webp": { extension: "webp", kind: "image" },
  "image/gif": { extension: "gif", kind: "image" },
  "image/avif": { extension: "avif", kind: "image" },
  "image/svg+xml": { extension: "svg", kind: "image" },
  "video/mp4": { extension: "mp4", kind: "video" },
  "video/webm": { extension: "webm", kind: "video" },
  "video/quicktime": { extension: "mov", kind: "video" },
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 })
  }

  const form = await request.formData()
  const file = form.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 })
  }

  const mediaType = MEDIA_TYPES[file.type]
  // Allowlist rather than trusting the filename — an arbitrary extension
  // is how you end up writing a .js into a served directory.
  if (!mediaType) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}` },
      { status: 400 },
    )
  }

  const maxBytes =
    mediaType.kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: `Too large — ${(file.size / 1e6).toFixed(1)}MB, limit is ${
          maxBytes / 1024 / 1024
        }MB.`,
      },
      { status: 400 },
    )
  }

  const base = path
    .basename(file.name, path.extname(file.name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)

  const name = `${base || mediaType.kind}-${Date.now().toString(36)}.${mediaType.extension}`

  await mkdir(UPLOADS_DIR, { recursive: true })
  await writeFile(
    path.join(UPLOADS_DIR, name),
    Buffer.from(await file.arrayBuffer()),
  )

  return NextResponse.json({ src: `/uploads/${name}`, kind: mediaType.kind })
}
