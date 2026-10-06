import { PortfolioNav } from "@/components/portfolio-nav"
import { EmailContact } from "@/components/email-contact"

export default function Email() {
  return <div className="home-page">
    <PortfolioNav active="email" />
    <EmailContact />
  </div>
}
