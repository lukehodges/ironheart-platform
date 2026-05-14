"use client"

import { useState } from "react"
import Link from "next/link"
import {
  MapPin,
  ArrowLeft,
  Search,
  Plus,
  User,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import { contacts } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Contact picker with search
// ---------------------------------------------------------------------------

function ContactPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const supplyContacts = contacts.filter((c) => c.side === "supply")
  const filtered = supplyContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
  )

  const selected = contacts.find((c) => c.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
      >
        {selected ? (
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full ${selected.avatarColor} flex items-center justify-center`}>
              <span className="text-[10px] font-bold text-white">{selected.initials}</span>
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{selected.company} &middot; {selected.type}</p>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">Select a landowner or contact...</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id)
                  setOpen(false)
                  setSearch("")
                }}
                className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-muted transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded-full ${c.avatarColor} flex items-center justify-center shrink-0`}>
                  <span className="text-[10px] font-bold text-white">{c.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.company} &middot; {c.type}</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No contacts found</p>
            )}
          </div>
          <div className="border-t border-border p-2">
            <Link
              href="/admin/brokerage-mockups/contacts/new"
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Create new contact
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function NewSitePage() {
  const [contactId, setContactId] = useState("")
  const [address, setAddress] = useState("")
  const [areaHectares, setAreaHectares] = useState("")
  const [currentUse, setCurrentUse] = useState("")
  const [soilType, setSoilType] = useState("")
  const [nitrogenChecked, setNitrogenChecked] = useState(false)
  const [phosphorusChecked, setPhosphorusChecked] = useState(false)
  const [bngChecked, setBngChecked] = useState(false)
  const [notes, setNotes] = useState("")

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Back link */}
      <Link
        href="/admin/brokerage-mockups/sites"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Sites
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          New Site
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Onboard a new gain site for nutrient or BNG credit generation
        </p>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Initial Status:
        </span>
        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
          Prospecting
        </Badge>
      </div>

      <Separator />

      {/* Landowner / Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Landowner Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContactPicker value={contactId} onChange={setContactId} />
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="e.g. Manor Farm Lane, Kings Worthy, Winchester SO21 1HR"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Map placeholder */}
          <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center border border-border">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Map preview</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Enter an address above to locate on map
              </p>
            </div>
          </div>

          {/* Auto-detected catchment */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Catchment (auto-detected):</span>
            <Badge variant="outline" className="text-xs font-medium">
              {address ? "Solent" : "Enter address to detect"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Land Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Land Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Area (hectares)</Label>
              <Input
                id="area"
                type="number"
                placeholder="e.g. 60"
                value={areaHectares}
                onChange={(e) => setAreaHectares(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landUse">Current Land Use</Label>
              <Select value={currentUse} onValueChange={setCurrentUse}>
                <SelectTrigger id="landUse">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arable">Arable</SelectItem>
                  <SelectItem value="Pasture">Pasture</SelectItem>
                  <SelectItem value="Dairy">Dairy</SelectItem>
                  <SelectItem value="Woodland">Woodland</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="soil">Soil Type</Label>
              <Input
                id="soil"
                placeholder="e.g. Clay loam"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Credit Type</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Select all credit types this site may generate
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={nitrogenChecked}
                onCheckedChange={(c) => setNitrogenChecked(c === true)}
              />
              <span className="text-sm text-foreground">Nitrogen</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={phosphorusChecked}
                onCheckedChange={(c) => setPhosphorusChecked(c === true)}
              />
              <span className="text-sm text-foreground">Phosphorus</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={bngChecked}
                onCheckedChange={(c) => setBngChecked(c === true)}
              />
              <span className="text-sm text-foreground">BNG</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any additional notes about this site prospect..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" asChild>
          <Link href="/admin/brokerage-mockups/sites">Cancel</Link>
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          Create Site
        </Button>
      </div>
    </div>
  )
}
