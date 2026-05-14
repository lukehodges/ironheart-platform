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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
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
  Building2,
  Percent,
  MapPin,
  GitBranch,
  Ruler,
  Upload,
  Save,
  Users,
  Plug,
  Bell,
  Layers,
  RefreshCw,
  ExternalLink,
} from "lucide-react"

const tabs = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "commission", label: "Commission", icon: Percent },
  { id: "regions", label: "Regions", icon: MapPin },
  { id: "stages", label: "Stages", icon: GitBranch },
  { id: "units", label: "Units", icon: Ruler },
] as const

type TabId = (typeof tabs)[number]["id"]

const commissionOverrides = [
  { type: "Nitrogen Credits", rate: 20 },
  { type: "Phosphorus Credits", rate: 20 },
  { type: "BNG Credits", rate: 18 },
]

const regions = [
  { name: "Solent", checked: true },
  { name: "Test Valley", checked: true },
  { name: "Stour", checked: false },
  { name: "Exe", checked: false },
  { name: "Tees", checked: false },
]

const dealStages = [
  { name: "Prospecting", colour: "bg-slate-400", enabled: true },
  { name: "Initial Contact", colour: "bg-blue-400", enabled: true },
  { name: "Requirements Gathered", colour: "bg-blue-500", enabled: true },
  { name: "Site Matched", colour: "bg-indigo-500", enabled: true },
  { name: "Quote Sent", colour: "bg-purple-500", enabled: true },
  { name: "Quote Accepted", colour: "bg-violet-500", enabled: true },
  { name: "Legal Drafting", colour: "bg-amber-500", enabled: true },
  { name: "Legal Review", colour: "bg-orange-500", enabled: true },
  { name: "Contracts Signed", colour: "bg-cyan-500", enabled: true },
  { name: "Payment Pending", colour: "bg-teal-500", enabled: true },
  { name: "Payment Received", colour: "bg-emerald-400", enabled: true },
  { name: "Credits Allocated", colour: "bg-emerald-500", enabled: true },
  { name: "LPA Confirmed", colour: "bg-green-500", enabled: true },
  { name: "Completed", colour: "bg-green-600", enabled: true },
]

const unitTypes = [
  { name: "Nitrogen", unit: "kg/yr", enabled: true },
  { name: "Phosphorus", unit: "kg/yr", enabled: true },
  { name: "BNG", unit: "biodiversity units", enabled: true },
]

const settingsLinks = [
  { href: "/admin/brokerage-mockups/settings/users", label: "Users & Team", icon: Users },
  { href: "/admin/brokerage-mockups/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/admin/brokerage-mockups/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/brokerage-mockups/settings/vertical", label: "Vertical Config", icon: Layers },
]

export default function SettingsGeneralPage() {
  const [activeTab, setActiveTab] = useState<TabId>("company")
  const [stageStates, setStageStates] = useState(
    dealStages.map((s) => ({ ...s }))
  )
  const [regionStates, setRegionStates] = useState(
    regions.map((r) => ({ ...r }))
  )
  const [unitStates, setUnitStates] = useState(
    unitTypes.map((u) => ({ ...u }))
  )

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your brokerage configuration and preferences
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settingsLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Button>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Company tab */}
      {activeTab === "company" && (
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Basic details about your brokerage company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  defaultValue="Hampshire BNG Solutions Ltd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary-contact">Primary Contact</Label>
                <Input
                  id="primary-contact"
                  defaultValue="James Harris"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground hover:border-muted-foreground/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs mt-1">SVG, PNG or JPG (max 2MB)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                defaultValue={"14 Romsey Road\nSouthampton\nSO16 4DH"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                defaultValue="https://hampshirebng.co.uk"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission tab */}
      {activeTab === "commission" && (
        <Card>
          <CardHeader>
            <CardTitle>Commission Settings</CardTitle>
            <CardDescription>
              Configure default commission rates and per-credit overrides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="default-rate">Default Commission Rate (%)</Label>
                <Input
                  id="default-rate"
                  type="number"
                  defaultValue={20}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission-model">Commission Model</Label>
                <Select defaultValue="percentage">
                  <SelectTrigger id="commission-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage of Sale</SelectItem>
                    <SelectItem value="fixed">Fixed Fee per Credit</SelectItem>
                    <SelectItem value="tiered">Tiered (Volume-Based)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (Base + %)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Per-Credit-Type Overrides
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Type</TableHead>
                    <TableHead className="w-32">Rate (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionOverrides.map((item) => (
                    <TableRow key={item.type}>
                      <TableCell className="font-medium">
                        {item.type}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          defaultValue={item.rate}
                          min={0}
                          max={100}
                          className="w-24"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regions tab */}
      {activeTab === "regions" && (
        <Card>
          <CardHeader>
            <CardTitle>Active Catchments</CardTitle>
            <CardDescription>
              Select the nutrient catchment regions your brokerage operates in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {regionStates.map((region, idx) => (
              <div
                key={region.name}
                className="flex items-center gap-3 py-2"
              >
                <Checkbox
                  id={`region-${idx}`}
                  checked={region.checked}
                  onCheckedChange={(checked) => {
                    const next = [...regionStates]
                    next[idx] = { ...next[idx], checked: !!checked }
                    setRegionStates(next)
                  }}
                />
                <Label
                  htmlFor={`region-${idx}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {region.name}
                </Label>
              </div>
            ))}
            <Separator />
            <Button variant="outline" size="sm">
              + Add Custom Region
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stages tab */}
      {activeTab === "stages" && (
        <Card>
          <CardHeader>
            <CardTitle>Deal Stages</CardTitle>
            <CardDescription>
              Configure deal pipeline stages and their availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stageStates.map((stage, idx) => (
                <div
                  key={stage.name}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${stage.colour}`}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {stage.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {stage.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      checked={stage.enabled}
                      onCheckedChange={(checked) => {
                        const next = [...stageStates]
                        next[idx] = { ...next[idx], enabled: checked }
                        setStageStates(next)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Units tab */}
      {activeTab === "units" && (
        <Card>
          <CardHeader>
            <CardTitle>Unit Types</CardTitle>
            <CardDescription>
              Configure the credit unit types your brokerage trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit Type</TableHead>
                  <TableHead>Measurement</TableHead>
                  <TableHead className="w-24 text-right">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unitStates.map((unit, idx) => (
                  <TableRow key={unit.name}>
                    <TableCell className="font-medium">{unit.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {unit.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={unit.enabled}
                        onCheckedChange={(checked) => {
                          const next = [...unitStates]
                          next[idx] = { ...next[idx], enabled: checked }
                          setUnitStates(next)
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Natural England Register Sync */}
      <Card className="mt-6 border-amber-200/60 bg-amber-50/30 dark:border-amber-800/40 dark:bg-amber-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">Natural England Register Sync</CardTitle>
                <CardDescription className="mt-0.5">
                  Sync site registrations, credit verifications, and BGS reference
                  numbers directly with the Natural England BNG Register
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-semibold shrink-0"
            >
              Coming soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-white/60 dark:bg-background/40 px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">NE BNG Register API</p>
              <p className="text-xs text-muted-foreground">
                Automatically verify credit certificates and sync BGS reference numbers
                on deal completion
              </p>
            </div>
            <Button disabled size="sm" className="ml-4 gap-1.5 shrink-0">
              <ExternalLink className="w-3.5 h-3.5" />
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="mt-6 flex justify-end">
        <Button className="gap-2">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
