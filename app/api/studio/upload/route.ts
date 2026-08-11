import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

/**
 * Writes an uploaded image into public/uploads and hands back its public
 * path. Development only, for the same reason the save endpoint is: a
 * deployed build has a read-only filesystem, and an open upload endpoint
 * is an obvious way to get arbitrary files onto a host.
 */
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads")
const MAX_BYTES = 8 * 1024 * 1024

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
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

  const extension = EXTENSIONS[file.type]
  // Allowlist rather than trusting the filename — an arbitrary extension
  // is how you end up writing a .js into a served directory.
  if (!extension) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}` },
      { status: 400 },
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Too large — ${(file.size / 1e6).toFixed(1)}MB, limit is 8MB.` },
      { status: 400 },
    )
  }

  const base = path
    .basename(file.name, path.extname(file.name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)

  const name = `${base || "image"}-${Date.now().toString(36)}.${extension}`

  await mkdir(UPLOADS_DIR, { recursive: true })
  await writeFile(
    path.join(UPLOADS_DIR, name),
    Buffer.from(await file.arrayBuffer()),
  )

  return NextResponse.json({ src: `/uploads/${name}` })
}
