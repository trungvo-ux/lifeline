"use client"

import { useEffect, useRef, type RefObject } from "react"

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"

/** Keep a portaled dialog in the keyboard and accessibility focus scope. */
export function useDialogFocus(
  rootRef: RefObject<HTMLElement | null>,
  open: boolean,
  onEscape: () => void,
) {
  const escapeRef = useRef(onEscape)
  useEffect(() => { escapeRef.current = onEscape }, [onEscape])

  useEffect(() => {
    const root = rootRef.current
    if (!open || !root) return

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const siblings = Array.from(document.body.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child !== root && !child.contains(root),
    )
    const previousInert = siblings.map((sibling) => sibling.inert)
    siblings.forEach((sibling) => { sibling.inert = true })

    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => !element.closest("[inert], [aria-hidden='true']") && element.getClientRects().length > 0,
    )
    ;(focusable()[0] ?? root).focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        escapeRef.current()
        return
      }
      if (event.key !== "Tab") return

      const stops = focusable()
      if (!stops.length) {
        event.preventDefault()
        root.focus()
        return
      }
      const first = stops[0]
      const last = stops[stops.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) {
        event.preventDefault()
        first.focus()
      }
    }
    root.addEventListener("keydown", onKeyDown)

    return () => {
      root.removeEventListener("keydown", onKeyDown)
      siblings.forEach((sibling, index) => { sibling.inert = previousInert[index] })
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open, rootRef])
}
