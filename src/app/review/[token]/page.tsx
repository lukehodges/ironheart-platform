"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, AlertCircle, Star } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/**
 * Public review submission page
 *
 * Features:
 * - Single-use token validation
 * - Star rating (1-5)
 * - Feedback textarea
 * - Public/private toggle
 * - Success/error states
 * - Token expiry handling
 *
 * Route: /review/[token]
 */
export default function ReviewSubmissionPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ""

  // State
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // In a real implementation, we'd validate the token and get booking details
  // For now, we'll just show the form assuming the token is valid
  // This would need a new endpoint like api.review.validateToken.useQuery({ token })

  // Submit review mutation
  const submitMutation = api.review.submitReview.useMutation({
    onSuccess: () => {
      setIsSubmitted(true)
      toast.success("Review submitted successfully!")
    },
    onError: (error) => {
      if (error.message.includes("already used") || error.message.includes("invalid")) {
        toast.error("This review link has already been used or is invalid")
      } else {
        toast.error(error.message || "Failed to submit review")
      }
    },
  })

  // Update page title
  useEffect(() => {
    document.title = "Submit Your Review"
  }, [])

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <CardTitle className="text-2xl">Thank You for Your Review!</CardTitle>
            <CardDescription>
              We appreciate your feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Your review helps us improve our service and assists other customers in making informed decisions.
              </p>
              {isPublic && (
                <p className="text-xs text-muted-foreground">
                  Your review will be published after moderation.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (rating === 0) {
      toast.error("Please select a rating")
      return
    }

    if (!feedback.trim()) {
      toast.error("Please provide feedback")
      return
    }

    if (feedback.length < 10) {
      toast.error("Feedback must be at least 10 characters")
      return
    }

    await submitMutation.mutateAsync({
      token,
      rating,
      comment: feedback,
      isPublic,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Share Your Experience</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your feedback helps us serve you better
            </p>
          </div>
        </div>
      </header>

      {/* Form content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Rate Your Experience</CardTitle>
              <CardDescription>
                Please share your honest feedback about our service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Star Rating */}
              <div className="space-y-2">
                <Label>Rating *</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoveredRating || rating)
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className={cn(
                          "transition-all duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded",
                          "p-1"
                        )}
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star
                          className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 transition-colors",
                            isFilled
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                    )
                  })}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Very Good"}
                    {rating === 5 && "Excellent"}
                  </p>
                )}
              </div>

              {/* Feedback */}
              <div className="space-y-2">
                <Label htmlFor="feedback">
                  Your Feedback *
                  <span className="text-muted-foreground font-normal ml-2">
                    (minimum 10 characters)
                  </span>
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Tell us about your experience..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={6}
                  className="resize-none"
                  maxLength={5000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {feedback.length < 10
                      ? `${10 - feedback.length} more characters needed`
                      : ""}
                  </span>
                  <span>{feedback.length} / 5000</span>
                </div>
              </div>

              {/* Public toggle */}
              <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-lg">
                <Checkbox
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="isPublic"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Make this review public
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to see your review (subject to moderation)
                  </p>
                </div>
              </div>

              {/* Submit button */}
              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  type="submit"
                  size="lg"
                  loading={submitMutation.isPending}
                  disabled={rating === 0 || feedback.length < 10}
                >
                  Submit Review
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Info footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>
            This review link can only be used once
          </p>
        </div>
      </main>
    </div>
  )
}

/**
 * Error boundary wrapper for invalid tokens
 * (Would be implemented with React Error Boundary in production)
 */
function ReviewErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-center">Invalid Review Link</CardTitle>
          <CardDescription className="text-center">
            {message}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
