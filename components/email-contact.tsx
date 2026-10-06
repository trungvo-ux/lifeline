"use client"

import { useState } from "react"
import "./email-contact.css"

export function EmailContact() {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSending(true)
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body }) })
      if (!response.ok) throw new Error("Contact is unavailable right now.")
      const data = await response.json() as { href?: string }
      if (!data.href?.startsWith("mailto:")) throw new Error("Contact is unavailable right now.")
      window.location.href = data.href
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Contact is unavailable right now.")
    } finally {
      setSending(false)
    }
  }

  return <main className="email-page">
    <h1>Get in touch</h1>
    <form onSubmit={send}>
      <label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} required /></label>
      <label>Message<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={6} required /></label>
      <button type="submit" disabled={sending}>Compose email</button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  </main>
}
