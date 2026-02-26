"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ProfileHeader } from "@/components/team/profile/profile-header"
import { OverviewTab } from "@/components/team/profile/overview-tab"
import { SkillsTab } from "@/components/team/profile/skills-tab"
import { CapacityTab } from "@/components/team/profile/capacity-tab"
import { AvailabilityTab } from "@/components/team/profile/availability-tab"
import { AssignmentsTab } from "@/components/team/profile/assignments-tab"
import { ActivityTab } from "@/components/team/profile/activity-tab"
import { NotesTab } from "@/components/team/profile/notes-tab"

// ─── Loading skeleton ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Skeleton className="h-8 w-28" />

      {/* Header card */}
      <div className="rounded-xl border border-border p-6">
        <div className="flex items-start gap-6">
          <Skeleton className="h-20 w-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-7 w-28" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-9 w-full max-w-lg" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

// ─── Error state ─────────────────────────────────────────────────────────────

function ProfileError({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
      <div className="text-center space-y-1">
        <h2 className="text-base font-semibold text-foreground">Failed to load profile</h2>
        <p className="text-sm text-muted-foreground">
          The staff member could not be found or an error occurred.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to Team
        </Button>
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TeamMemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const isValidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const {
    data: member,
    isLoading,
    isError,
    refetch,
  } = api.team.getById.useQuery(
    { userId: id },
    { enabled: isValidId }
  )

  if (!isValidId) {
    return (
      <div className="animate-fade-in">
        <ProfileError
          onRetry={() => router.push("/admin/team")}
          onBack={() => router.push("/admin/team")}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <ProfileSkeleton />
      </div>
    )
  }

  if (isError || !member) {
    return (
      <div className="animate-fade-in">
        <ProfileError
          onRetry={() => void refetch()}
          onBack={() => router.push("/admin/team")}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => router.push("/admin/team")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Team
      </Button>

      {/* Profile header */}
      <ProfileHeader member={member} onUpdate={() => void refetch()} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab member={member} onUpdate={() => void refetch()} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="py-6">
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Staff calendar will be available when the scheduling module is extended.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This tab will aggregate availability, bookings, and leave into a unified calendar view.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <SkillsTab memberId={member.id} />
        </TabsContent>

        <TabsContent value="capacity" className="mt-4">
          <CapacityTab memberId={member.id} />
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <AvailabilityTab memberId={member.id} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <AssignmentsTab memberId={member.id} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesTab memberId={member.id} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityTab memberId={member.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
