"use client"

import dynamic from "next/dynamic"
import { PortfolioNav } from "@/components/portfolio-nav"
import "@/components/home-experience.css"

const HangingPhoto = dynamic(() => import("@/components/hanging-photo").then((module) => module.HangingPhoto), { ssr: false })

export default function About() {
  return <div className="home-page">
    <PortfolioNav active="about" />
    <main className="home-secondary home-about">
      <HangingPhoto />
      <p>I&rsquo;m interested in doing micro-interactions &amp; animations.</p>
      <p>I design systems for complex data work, currently at IBM on watsonx.data, focusing on how teams query, visualize, and act on data at scale. I&rsquo;m curious about how AI can enhance humanity and how to implement safeguards for it.</p>
    </main>
  </div>
}
