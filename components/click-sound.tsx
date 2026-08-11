"use client"

import { useEffect, useRef } from "react"

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='tab']",
  "[role='menuitem']",
  "[data-click-sound]",
].join(",")

export function ClickSound() {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    function playClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return

      const interactive = event.target.closest(INTERACTIVE_SELECTOR)
      if (!interactive || interactive.getAttribute("aria-disabled") === "true") {
        return
      }

      // Photo cards opt in as a whole, but their upload label dispatches a
      // second click to the hidden file input. Let that input own the sound so
      // a single user gesture never produces a doubled click.
      if (
        interactive.getAttribute("data-click-sound") === "photo-card" &&
        event.target.closest("label, input")
      ) {
        return
      }

      const audio = audioRef.current
      if (!audio) return

      audio.pause()
      audio.currentTime = 0
      audio.volume = 0.45
      void audio.play().catch(() => undefined)
    }

    document.addEventListener("click", playClick)
    return () => document.removeEventListener("click", playClick)
  }, [])

  return (
    <audio
      ref={audioRef}
      src="/audio/click.mp3"
      preload="auto"
      aria-hidden="true"
    />
  )
}
