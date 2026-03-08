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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  UserPlus,
  MoreHorizontal,
  Mail,
  Shield,
  Pencil,
  Trash2,
  Check,
  X,
  Send,
} from "lucide-react"

const users = [
  {
    name: "James Harris",
    email: "james@hampshirebng.co.uk",
    roles: ["Admin", "Broker"],
    status: "Active",
    lastActive: "2 hours ago",
    initials: "JH",
    colour: "bg-blue-600",
  },
  {
    name: "Sarah Croft",
    email: "sarah@hampshirebng.co.uk",
    roles: ["Broker"],
    status: "Active",
    lastActive: "30 mins ago",
    initials: "SC",
    colour: "bg-purple-600",
  },
  {
    name: "Tom Jenkins",
    email: "tom@hampshirebng.co.uk",
    roles: ["Broker"],
    status: "Active",
    lastActive: "1 hour ago",
    initials: "TJ",
    colour: "bg-emerald-600",
  },
  {
    name: "Emma Walsh",
    email: "emma@hampshirebng.co.uk",
    roles: ["Assessor"],
    status: "Active",
    lastActive: "3 hours ago",
    initials: "EW",
    colour: "bg-amber-600",
  },
  {
    name: "David Park",
    email: "david@hampshirebng.co.uk",
    roles: ["Assessor"],
    status: "Active",
    lastActive: "1 day ago",
    initials: "DP",
    colour: "bg-rose-600",
  },
]

const roleBadgeColour: Record<string, string> = {
  Admin:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  Broker:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  Assessor:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
}

const permissions = [
  { label: "View Deals", admin: true, broker: true, assessor: false },
  { label: "Edit Deals", admin: true, broker: true, assessor: false },
  { label: "View Financials", admin: true, broker: true, assessor: false },
  { label: "Edit Financials", admin: true, broker: false, assessor: false },
  { label: "Manage Settings", admin: true, broker: false, assessor: false },
  { label: "Manage Users", admin: true, broker: false, assessor: false },
  { label: "View Reports", admin: true, broker: true, assessor: true },
]

export default function SettingsUsersPage() {
  const [showInviteForm, setShowInviteForm] = useState(false)

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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Users &amp; Team
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team members, roles, and permissions
          </p>
        </div>
        <Button
          className="gap-1.5"
          onClick={() => setShowInviteForm(!showInviteForm)}
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <Card className="mb-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Invite New User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@hampshirebng.co.uk"
                />
              </div>
              <div className="w-48 space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select defaultValue="broker">
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                    <SelectItem value="assessor">Assessor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="gap-1.5">
                <Send className="w-4 h-4" />
                Send Invite
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInviteForm(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User list */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {users.length} active members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell>
                    <div
                      className={`w-8 h-8 rounded-full ${user.colour} flex items-center justify-center`}
                    >
                      <span className="text-xs font-semibold text-white">
                        {user.initials}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className={`text-xs ${roleBadgeColour[role] ?? ""}`}
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs"
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.lastActive}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="w-3.5 h-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="w-3.5 h-3.5 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-3.5 h-3.5 mr-2" />
                          Resend Invite
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permissions matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Overview of what each role can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                <TableHead className="text-center w-28">
                  <Badge
                    variant="outline"
                    className={`text-xs ${roleBadgeColour.Admin}`}
                  >
                    Admin
                  </Badge>
                </TableHead>
                <TableHead className="text-center w-28">
                  <Badge
                    variant="outline"
                    className={`text-xs ${roleBadgeColour.Broker}`}
                  >
                    Broker
                  </Badge>
                </TableHead>
                <TableHead className="text-center w-28">
                  <Badge
                    variant="outline"
                    className={`text-xs ${roleBadgeColour.Assessor}`}
                  >
                    Assessor
                  </Badge>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((perm) => (
                <TableRow key={perm.label}>
                  <TableCell className="font-medium">{perm.label}</TableCell>
                  <TableCell className="text-center">
                    {perm.admin ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.broker ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.assessor ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
