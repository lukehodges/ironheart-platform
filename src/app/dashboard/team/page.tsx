"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  UserPlus,
  Send,
  CheckCircle2,
  Clock,
  Mail,
  CalendarCheck,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Placeholder team data
// ---------------------------------------------------------------------------

type QuestionnaireStatus = "completed" | "sent" | "pending"
type BookingStatus = "booked" | "pending"

interface TeamMember {
  id: string
  name: string
  role: string
  initials: string
  questionnaireStatus: QuestionnaireStatus
  bookingStatus: BookingStatus
}

const MOCK_TEAM: TeamMember[] = [
  {
    id: "1",
    name: "Sarah Mitchell",
    role: "Managing Director",
    initials: "SM",
    questionnaireStatus: "completed",
    bookingStatus: "booked",
  },
  {
    id: "2",
    name: "James Thornton",
    role: "Operations Manager",
    initials: "JT",
    questionnaireStatus: "sent",
    bookingStatus: "pending",
  },
  {
    id: "3",
    name: "Priya Sharma",
    role: "Finance Lead",
    initials: "PS",
    questionnaireStatus: "completed",
    bookingStatus: "booked",
  },
  {
    id: "4",
    name: "David Chen",
    role: "Technical Director",
    initials: "DC",
    questionnaireStatus: "pending",
    bookingStatus: "pending",
  },
  {
    id: "5",
    name: "Emma Williams",
    role: "HR Manager",
    initials: "EW",
    questionnaireStatus: "sent",
    bookingStatus: "pending",
  },
]

const QUESTIONNAIRE_BADGE: Record<
  QuestionnaireStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-[#2F6F5C] border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  sent: {
    label: "Sent",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Mail className="h-3 w-3" />,
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-[#B8860B] border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
}

const BOOKING_BADGE: Record<
  BookingStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  booked: {
    label: "Booked",
    className: "bg-emerald-50 text-[#2F6F5C] border-emerald-200",
    icon: <CalendarCheck className="h-3 w-3" />,
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-[#B8860B] border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
}

export default function TeamPage() {
  const team = MOCK_TEAM

  const completedCount = team.filter(
    (m) => m.questionnaireStatus === "completed"
  ).length
  const bookedCount = team.filter((m) => m.bookingStatus === "booked").length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-900">Your Team</h1>
          <p className="mt-1 text-stone-500">
            {team.length} members &middot; {completedCount} questionnaires
            completed &middot; {bookedCount} calls booked
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Send className="h-4 w-4" />
            Send Reminders
          </Button>
          <Button className="gap-2 bg-[#D13A1F] hover:bg-[#b5301a]">
            <UserPlus className="h-4 w-4" />
            Add Team Member
          </Button>
        </div>
      </div>

      {/* Team roster */}
      <Card className="border-stone-200 bg-white">
        <CardHeader>
          <CardTitle className="text-base text-stone-700">
            Team Roster
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {team.map((member, idx) => {
            const qBadge = QUESTIONNAIRE_BADGE[member.questionnaireStatus]
            const bBadge = BOOKING_BADGE[member.bookingStatus]
            return (
              <div key={member.id}>
                {idx > 0 && <Separator />}
                <div className="flex items-center justify-between px-6 py-4">
                  {/* Member info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-stone-100 text-xs font-semibold text-stone-600">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {member.name}
                      </p>
                      <p className="text-xs text-stone-500">{member.role}</p>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
                        Questionnaire
                      </p>
                      <Badge className={qBadge.className}>
                        <span className="flex items-center gap-1">
                          {qBadge.icon}
                          {qBadge.label}
                        </span>
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
                        Call
                      </p>
                      <Badge className={bBadge.className}>
                        <span className="flex items-center gap-1">
                          {bBadge.icon}
                          {bBadge.label}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
