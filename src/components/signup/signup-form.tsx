"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/trpc/react"

interface SignupFormProps {
  productSlug: string
  productName: string
}

export function SignupForm({ productSlug, productName }: SignupFormProps) {
  const [businessName, setBusinessName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  const checkoutMutation = api.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl
    },
    onError: (err) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const origin = window.location.origin
    checkoutMutation.mutate({
      productSlug,
      businessName,
      email,
      successUrl: `${origin}/signup/${productSlug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/products/${productSlug}`,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business Name</Label>
        <Input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Your business name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={checkoutMutation.isPending}
      >
        {checkoutMutation.isPending
          ? "Redirecting to checkout..."
          : `Start Free Trial of ${productName}`}
      </Button>
    </form>
  )
}
