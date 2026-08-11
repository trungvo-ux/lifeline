import { NextResponse } from "next/server"

const MAX_SUBJECT_LENGTH = 120
const MAX_BODY_LENGTH = 5_000

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin
  const origin = request.headers.get("origin")

  if (!origin || origin !== requestOrigin) {
    return new NextResponse(null, { status: 403 })
  }

  let payload: { subject?: unknown; body?: unknown; website?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  // Honeypot for basic automated form submissions.
  if (payload.website) {
    return NextResponse.json({ ok: true })
  }

  const subject = typeof payload.subject === "string" ? payload.subject.trim() : ""
  const body = typeof payload.body === "string" ? payload.body.trim() : ""
  const contactEmail = process.env.CONTACT_EMAIL

  if (!contactEmail) {
    return NextResponse.json({ error: "Contact is unavailable." }, { status: 503 })
  }

  if (
    !subject ||
    !body ||
    subject.length > MAX_SUBJECT_LENGTH ||
    body.length > MAX_BODY_LENGTH
  ) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 })
  }

  const href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return NextResponse.json({ href })
}
