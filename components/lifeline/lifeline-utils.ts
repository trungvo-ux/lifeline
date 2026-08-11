import type { LifelineMarker } from "./types"

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * A composited layer resting on a fractional offset resamples its whole
 * subtree — text goes soft. Snapping to the device pixel grid (not whole
 * CSS pixels) keeps half-pixel steps on retina, so motion stays smooth.
 */
export function snapToDevicePixel(value: number) {
  const dpr = window.devicePixelRatio || 1
  return Math.round(value * dpr) / dpr
}

export function hasMarkerContent(marker: LifelineMarker) {
  return (
    marker.events.length > 0 ||
    (marker.companies?.length ?? 0) > 0 ||
    (marker.mentors?.length ?? 0) > 0 ||
    (marker.met?.length ?? 0) > 0
  )
}

export function hasMarkerPeople(marker: LifelineMarker) {
  return (marker.mentors?.length ?? 0) > 0 || (marker.met?.length ?? 0) > 0
}

export function getMarkerHeight(marker: LifelineMarker, nextYear?: number) {
  const hasContent = hasMarkerContent(marker)
  const hasPeople = hasMarkerPeople(marker)

  if (!hasContent) return 48

  const peopleOnly =
    hasPeople &&
    marker.events.length === 0 &&
    (marker.companies?.length ?? 0) === 0

  let height = 96

  if (marker.companies?.length) height += 28
  height += marker.events.length * 44

  if (peopleOnly) height += 88
  else if (hasPeople) height += 108

  if (!nextYear) return Math.min(520, Math.max(peopleOnly ? 148 : 188, height))

  const gap = Math.max(1, nextYear - marker.year)
  height += Math.min(32, gap * 3)

  return Math.min(520, Math.max(peopleOnly ? 148 : 188, height))
}

export function getMarkerWidth(marker: LifelineMarker, nextYear?: number) {
  const hasContent = hasMarkerContent(marker)
  const hasPeople = hasMarkerPeople(marker)

  // The last marker has no neighbour to space against, so its own width
  // *is* the trailing room. It needs enough to clear the 200px right fade
  // plus the 288px text column, or the scrub bottoms out with the final
  // milestone half-faded against the edge instead of sitting as the
  // focal point it should be.
  if (!nextYear) return hasContent ? 640 : 80
  if (!hasContent) return 80

  const peopleOnly =
    hasPeople &&
    marker.events.length === 0 &&
    (marker.companies?.length ?? 0) === 0

  if (peopleOnly) return 220

  const gap = Math.max(1, nextYear - marker.year)
  return Math.min(480, Math.max(400, gap * 36))
}