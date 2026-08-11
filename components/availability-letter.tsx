"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

const CLOSE_FALLBACK_MS = 150
const SEND_MS = 700
const SESSION_SEND_COUNT_KEY = "portfolio-letter-send-count"
const SESSION_SEND_LIMIT = 3

function getSessionSendCount() {
  try {
    const count = Number.parseInt(
      window.sessionStorage.getItem(SESSION_SEND_COUNT_KEY) ?? "0",
      10
    )
    return Number.isFinite(count) ? count : 0
  } catch {
    return 0
  }
}

function getSpamQuip(count: number) {
  if (count >= SESSION_SEND_LIMIT) {
    return "Spamming me? My inbox is taking a session break."
  }
  if (count === 2) {
    return "Spamming me? My inbox is starting to side-eye you."
  }
  if (count === 1) {
    return "One note down. My inbox remembers you."
  }
  return ""
}

function cssDurationInMs(name: string, fallback: number) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()

  if (!value) return fallback
  if (value.endsWith("ms")) return Number.parseFloat(value) || fallback
  if (value.endsWith("s")) return (Number.parseFloat(value) || 0) * 1000
  return fallback
}

export function AvailabilityLetter() {
  const [isMounted, setIsMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState(false)
  const [spamQuip, setSpamQuip] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const emailWrapRef = useRef<HTMLDivElement>(null)
  const sendAudioRef = useRef<HTMLAudioElement>(null)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  function openLetter() {
    clearTimer()
    setIsMounted(true)
    setIsClosing(false)
    setIsSending(false)
    setEmailError(false)
    setSpamQuip(getSpamQuip(getSessionSendCount()))

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsVisible(true))
    })
  }

  const closeLetter = useCallback(() => {
    if (isSending) return

    clearTimer()
    setIsVisible(false)
    setIsClosing(true)

    const closeMs = cssDurationInMs("--modal-close-dur", CLOSE_FALLBACK_MS)
    timerRef.current = window.setTimeout(() => {
      setIsMounted(false)
      setIsClosing(false)
      triggerRef.current?.focus()
    }, closeMs)
  }, [clearTimer, isSending])

  async function sendLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const letter = message.trim()
    if (!letter || isSending) return

    const senderEmail = email.trim()
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)
    if (!isValidEmail) {
      setEmailError(true)

      window.requestAnimationFrame(() => {
        const wrap = emailWrapRef.current
        const input = emailInputRef.current
        if (!wrap || !input) return

        wrap.classList.add("is-error")
        input.classList.add("is-error")
        input.classList.remove("is-shaking")
        void input.offsetWidth
        input.classList.add("is-shaking")
        input.focus()
      })
      return
    }

    const sendCount = getSessionSendCount()
    if (sendCount >= SESSION_SEND_LIMIT) {
      setSpamQuip(getSpamQuip(sendCount))
      emailInputRef.current?.focus()
      return
    }

    try {
      window.sessionStorage.setItem(
        SESSION_SEND_COUNT_KEY,
        String(sendCount + 1)
      )
    } catch {
      // Storage can be unavailable in strict privacy modes; sending still works.
    }

    clearTimer()

    const sendAudio = sendAudioRef.current
    if (sendAudio) {
      sendAudio.currentTime = 0
      sendAudio.volume = 0.7
      void sendAudio.play().catch(() => undefined)
    }

    setIsSending(true)

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    timerRef.current = window.setTimeout(
      () => {
        void fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: "A note from your portfolio",
            body: `Dear Trung,\n\n${letter}\n\nSincerely,\n${senderEmail}`,
            website: "",
          }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error("Contact is unavailable")
            return response.json() as Promise<{ href?: string }>
          })
          .then(({ href }) => {
            if (!href?.startsWith("mailto:")) throw new Error("Invalid contact link")

            setIsVisible(false)
            setIsMounted(false)
            setIsClosing(false)
            setIsSending(false)
            setMessage("")
            setEmail("")
            setEmailError(false)
            window.location.href = href
          })
          .catch(() => {
            setIsSending(false)
            setSpamQuip("Email is unavailable right now. Please try again.")
          })
      },
      reduceMotion ? 80 : SEND_MS
    )
  }

  useEffect(() => {
    if (!isMounted) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    textareaRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLetter()
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [closeLetter, isMounted])

  useEffect(
    () => () => {
      clearTimer()
    },
    [clearTimer]
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openLetter}
        className="availability-trigger mt-4 inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm text-black outline-none dark:text-zinc-100"
        aria-haspopup="dialog"
        aria-expanded={isMounted}
      >
        <span
          className="availability-dot h-2 w-2 rounded-full bg-green-500"
          aria-hidden="true"
        />
        Available to Work
      </button>

      <audio
        ref={sendAudioRef}
        src="/audio/send.mp3"
        preload="auto"
        aria-hidden="true"
      />

      {isMounted &&
        createPortal(
          <div
            className={`letter-overlay ${isVisible ? "is-open" : ""} ${
              isClosing ? "is-closing" : ""
            } ${isSending ? "is-sending" : ""}`}
            aria-hidden={!isVisible && !isSending}
          >
            <button
              type="button"
              className="letter-backdrop"
              onClick={closeLetter}
              aria-label="Close letter"
              tabIndex={-1}
            />

            <div
              className={`t-modal letter-dialog ${
                isVisible ? "is-open" : ""
              } ${isClosing ? "is-closing" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="letter-title"
            >
              <button
                type="button"
                className="letter-close"
                onClick={closeLetter}
                aria-label="Close letter"
                disabled={isSending}
              >
                <span aria-hidden="true">×</span>
              </button>

              <form
                className={`letter-form ${isSending ? "is-sending" : ""}`}
                onSubmit={sendLetter}
              >
                <div
                  className={`letter-paper ${isSending ? "is-sending" : ""}`}
                >
                  <h2 id="letter-title" className="letter-heading">
                    Dear, Trung
                  </h2>

                  <label htmlFor="letter-message" className="sr-only">
                    Your message to Trung
                  </label>
                  <textarea
                    ref={textareaRef}
                    id="letter-message"
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value)
                    }}
                    className="letter-message"
                    placeholder="Write me a note..."
                    rows={8}
                    disabled={isSending}
                  />

                  <div
                    ref={emailWrapRef}
                    className={`t-input-wrap letter-signature ${
                      emailError ? "is-error" : ""
                    }`}
                  >
                    <label htmlFor="letter-email" className="letter-signoff">
                      Sincerely,
                    </label>
                    <input
                      ref={emailInputRef}
                      id="letter-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value)
                        setEmailError(false)
                      }}
                      className={`t-input letter-email-field ${
                        emailError ? "is-error" : ""
                      }`}
                      placeholder="your@email.com"
                      aria-invalid={emailError}
                      aria-describedby="letter-email-error"
                      disabled={isSending}
                    />
                    <svg
                      className="t-error-msg letter-email-scribble"
                      viewBox="0 0 210 16"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path d="M2 8 C 20 2, 31 14, 49 7 S 78 3, 95 9 S 124 13, 143 6 S 178 3, 208 9" />
                      <path d="M5 11 C 29 5, 46 13, 67 8 S 105 4, 125 11 S 165 13, 205 6" />
                    </svg>
                    <span
                      id="letter-email-error"
                      className="sr-only"
                      aria-live="polite"
                    >
                      {emailError ? "Add a valid email address." : ""}
                    </span>
                    <p
                      className={`letter-spam-quip ${
                        spamQuip ? "is-visible" : ""
                      }`}
                      aria-live="polite"
                    >
                      {spamQuip}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`letter-send ${
                    message.trim() ? "is-ready" : ""
                  }`}
                  disabled={!message.trim() || isSending}
                >
                  {isSending ? "Sending…" : "Send letter"}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
