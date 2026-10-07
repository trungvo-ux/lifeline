import { PortfolioNav } from "@/components/portfolio-nav"
import { EmailContact } from "@/components/email-contact"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Email — Trung Vo" }

export default function Email() {
  return <div className="home-page">
    <PortfolioNav active="email" />
    <EmailContact />
  </div>
}
