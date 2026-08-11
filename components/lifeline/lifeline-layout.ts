/**
 * Below this the timeline renders as the vertical list.
 *
 * The horizontal scrub needs room for its fade zones plus one readable
 * column: 400px of left-exit fade + a 400px column + 200px of right
 * fade ≈ 1000px. At the old 768px breakpoint a tablet had a 168px
 * clean band, so no milestone ever reached full opacity — every column
 * sat inside a fade. Tablets read the vertical layout instead.
 */
export const LIFELINE_MOBILE_BREAKPOINT = 1024

/**
 * How wide the rail is allowed to get before it stops growing with the
 * viewport, leaving a margin on the right.
 *
 * With a nav present the rail measures its end from that nav's centered
 * container. This page has no nav, so without this the rail ran full
 * bleed to the viewport edge and the final milestone had nothing to
 * breathe against. 64rem matches the `max-w-5xl` the shell's own
 * containers use, so the two agree if a nav is ever added back.
 */
export const LIFELINE_CONTENT_MAX_WIDTH = 1024
