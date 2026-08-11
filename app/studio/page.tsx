import { notFound } from "next/navigation"
import Studio from "./studio-client"

export default function StudioPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  return <Studio />
}
