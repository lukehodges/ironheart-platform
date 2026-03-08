"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Save } from "lucide-react"

interface NotificationRow {
  label: string
  inApp: boolean
  email: boolean
  sms: boolean
}

interface NotificationCategory {
  category: string
  rows: NotificationRow[]
}

const initialNotifications: NotificationCategory[] = [
  {
    category: "Compliance",
    rows: [
      { label: "Deadline approaching (7d)", inApp: true, email: true, sms: false },
      { label: "Deadline approaching (1d)", inApp: true, email: true, sms: true },
      { label: "Item overdue", inApp: true, email: true, sms: true },
      { label: "Item completed", inApp: true, email: false, sms: false },
    ],
  },
  {
    category: "Deals",
    rows: [
      { label: "Stage changed", inApp: true, email: true, sms: false },
      { label: "New deal", inApp: true, email: true, sms: false },
      { label: "Deal won", inApp: true, email: true, sms: true },
      { label: "Deal lost", inApp: true, email: true, sms: false },
    ],
  },
  {
    category: "Payments",
    rows: [
      { label: "Invoice sent", inApp: true, email: true, sms: false },
      { label: "Payment received", inApp: true, email: true, sms: true },
      { label: "Payment overdue", inApp: true, email: true, sms: true },
    ],
  },
  {
    category: "Assessments",
    rows: [
      { label: "Scheduled", inApp: true, email: true, sms: false },
      { label: "Completed", inApp: true, email: true, sms: false },
      { label: "Revision requested", inApp: true, email: true, sms: true },
    ],
  },
]

export default function SettingsNotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [dailyDigest, setDailyDigest] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(true)
  const [realTimeAlerts, setRealTimeAlerts] = useState(true)

  function toggleNotification(
    catIdx: number,
    rowIdx: number,
    channel: "inApp" | "email" | "sms"
  ) {
    const next = notifications.map((cat, ci) => {
      if (ci !== catIdx) return cat
      return {
        ...cat,
        rows: cat.rows.map((row, ri) => {
          if (ri !== rowIdx) return row
          return { ...row, [channel]: !row[channel] }
        }),
      }
    })
    setNotifications(next)
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/brokerage-mockups/settings">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Settings
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure how and when you receive notifications
        </p>
      </div>

      {/* Notification preference matrix */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Toggle notifications per event type and delivery channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Event</TableHead>
                <TableHead className="text-center w-24">In-App</TableHead>
                <TableHead className="text-center w-24">Email</TableHead>
                <TableHead className="text-center w-24">SMS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((cat, catIdx) => (
                <>
                  <TableRow key={`cat-${cat.category}`}>
                    <TableCell
                      colSpan={4}
                      className="bg-muted/50 font-semibold text-xs uppercase tracking-wider text-muted-foreground py-2"
                    >
                      {cat.category}
                    </TableCell>
                  </TableRow>
                  {cat.rows.map((row, rowIdx) => (
                    <TableRow key={`${cat.category}-${row.label}`}>
                      <TableCell className="text-sm">{row.label}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={row.inApp}
                            onCheckedChange={() =>
                              toggleNotification(catIdx, rowIdx, "inApp")
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={row.email}
                            onCheckedChange={() =>
                              toggleNotification(catIdx, rowIdx, "email")
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={row.sms}
                            onCheckedChange={() =>
                              toggleNotification(catIdx, rowIdx, "sms")
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Frequency settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Delivery Frequency</CardTitle>
          <CardDescription>
            Control batching and summary preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Daily Digest</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive a summary of the day&apos;s events
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select defaultValue="08:00">
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="07:00">07:00</SelectItem>
                  <SelectItem value="08:00">08:00</SelectItem>
                  <SelectItem value="09:00">09:00</SelectItem>
                  <SelectItem value="18:00">18:00</SelectItem>
                </SelectContent>
              </Select>
              <Switch
                checked={dailyDigest}
                onCheckedChange={setDailyDigest}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Weekly Summary</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive a weekly overview every Monday
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select defaultValue="monday">
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">Monday</SelectItem>
                  <SelectItem value="tuesday">Tuesday</SelectItem>
                  <SelectItem value="wednesday">Wednesday</SelectItem>
                  <SelectItem value="thursday">Thursday</SelectItem>
                  <SelectItem value="friday">Friday</SelectItem>
                </SelectContent>
              </Select>
              <Switch
                checked={weeklySummary}
                onCheckedChange={setWeeklySummary}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Real-time Alerts</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive push notifications immediately
              </p>
            </div>
            <Switch
              checked={realTimeAlerts}
              onCheckedChange={setRealTimeAlerts}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="gap-2">
          <Save className="w-4 h-4" />
          Save Preferences
        </Button>
      </div>
    </div>
  )
}
