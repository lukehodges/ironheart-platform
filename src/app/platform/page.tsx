import { redirect } from "next/navigation"

export default function PlatformPage() {
  // Redirect to tenants list as default platform page
  redirect("/platform/tenants")
}
