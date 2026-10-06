import Link from "next/link"
import "./portfolio-nav.css"

export function PortfolioNav({ active }: { active: "home" | "works" | "about" | "email" }) {
  return <nav className="portfolio-nav" aria-label="Primary navigation">
    {([ ["home", "Home", "/"], ["works", "Works", "/works"], ["about", "About", "/about"], ["email", "Email", "/email"] ] as const).map(([key, label, href]) =>
      <Link key={key} href={href} aria-current={active === key ? "page" : undefined}>{label}</Link>
    )}
  </nav>
}
