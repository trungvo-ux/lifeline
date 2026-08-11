import type { LifelineMarker } from "@/components/lifeline/types"

/**
 * Trung Vo's timeline. One marker per milestone — `year` is just the
 * position on the axis, `label` is what actually shows ("Aug 2003").
 * Titles render in black, descriptions in the timeline's gray.
 */
interface Milestone {
  id: string
  date: string
  title: string
  description: string
  /** Drop a file in public/images and point `image` at it. */
  image?: string
  /** Set false for a text-only milestone — no gray square at all. */
  square?: boolean
  /** A call to action under the description ("Read study"). */
  link?: { label: string; href: string }
}

const milestones: Milestone[] = [
  {
    id: "born",
    date: "Aug 2003",
    title: "Born in Oakland, CA",
    description:
      "The first child born in America to Vietnamese immigrant parents.",
    square: false,
  },
  {
    id: "high-school",
    date: "Jun 2021",
    title: "Graduated High School",
    description:
      "Finished with a 3.0 GPA after navigating school through COVID.",
    square: false,
  },
  {
    id: "vodux",
    date: "Nov 2021",
    title: "Started Vodux",
    description:
      "Created my first fashion label and learned how difficult selling products really is.",
  },
  {
    id: "uc-davis",
    date: "May 2023",
    title: "Transferred to UC Davis",
    description: "Moved from community college to pursue a career in Design.",
    square: false,
  },
  {
    id: "internship",
    date: "Jun 2024",
    title: "Unpaid Design Internship",
    description:
      "Earned college credit but realized experience matters more than titles.",
    square: false,
  },
  {
    id: "graduated",
    date: "Jun 2025",
    title: "Graduated University",
    description: "Finished my Design degree without knowing what came next.",
    square: false,
  },
  {
    id: "first-vc-job",
    date: "Jun 2025",
    title: "First VC Design Job",
    description:
      "Got paid very little, but learned more than any classroom could teach.",
    square: false,
  },
  {
    id: "zeme",
    date: "Aug 2025",
    title: "Joined Zeme",
    description: "Left my comfort zone to help build a startup in New York.",
    square: false,
  },
  {
    id: "zeme-redesign",
    date: "Sep 2025",
    title: "Launched Zeme Redesign",
    description: "Owned the product flow, design system, and visual identity.",
    link: { label: "Read study", href: "/study/zeme-redesign" },
  },
  {
    id: "techcrunch",
    date: "Oct 2025",
    title: "Featured on Techcrunch for PillarBiome",
    description: "Still working at the same time at the VC Design Job & Zeme.",
    link: { label: "Read study", href: "/study/pillarbiome" },
  },
  {
    id: "agentic-pivot",
    date: "Mar 2026",
    title: "Zeme AI Agentic Pivot",
    description: "Helped redesign the product around an AI-first experience.",
    link: { label: "Read study", href: "/study/agentic" },
  },
  {
    id: "ibm",
    date: "Mar 2026",
    title: "Joined IBM",
    description: "Started my next chapter on the watsonx.data design team.",
  },
  {
    id: "present",
    date: "Present",
    title: "watsonx.data",
    description: "Making ingesting data easier than ever with AI",
    square: false,
  },
]

const yearOf = (date: string) => Number(date.slice(-4))

/**
 * The axis is one step per marker, so the quiet years between two
 * milestones have to be real markers — a bare tick and the year, no
 * events. Without them Aug 2003 sits right next to Jun 2021 and the
 * timeline loses every sense of how long the gaps actually were.
 */
function buildMarkers(): LifelineMarker[] {
  const markers: LifelineMarker[] = []
  // Seeded from the first milestone so the timeline opens on it rather
  // than on two thousand empty years.
  let previousYear = yearOf(milestones[0].date)

  for (const milestone of milestones) {
    // A milestone can carry a word instead of a date ("Present"). It sits
    // wherever it falls in the list and contributes no filler years.
    const year = yearOf(milestone.date)

    for (let filler = previousYear + 1; filler < year; filler++) {
      markers.push({
        id: `year-${filler}`,
        year: markers.length + 1,
        label: `${filler}`,
        events: [],
      })
    }

    markers.push({
      id: milestone.id,
      year: markers.length + 1,
      label: milestone.date,
      events: [
        {
          title: milestone.title,
          text: milestone.description,
          ...(milestone.link && { link: milestone.link }),
        },
      ],
      // Omitting `media` entirely is what drops the square — an empty
      // object would still render the gray placeholder.
      ...(milestone.square === false
        ? {}
        : { media: { src: milestone.image, alt: milestone.title } }),
    })

    if (!Number.isNaN(year)) previousYear = year
  }

  return markers
}

export const trungvoLifeline = {
  name: "Trung Vo",
  description:
    "A designer's timeline — the projects, the pivots, and the things I built to find out what I liked.",
  markers: buildMarkers(),
}
