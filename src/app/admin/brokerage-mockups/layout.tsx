"use client"
import { Toaster } from "sonner"

export default function BrokerageMockupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  )
}
