"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Save, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ============================================================================
// TYPES
// ============================================================================

type ContactSide = "supply" | "demand"

const SUPPLY_TYPES = ["Landowner", "Farmer", "Land Agent", "Assessor"] as const
const DEMAND_TYPES = ["Developer", "Housebuilder"] as const

const BROKERS = [
  { id: "b-1", name: "James Harris" },
  { id: "b-2", name: "Sarah Croft" },
  { id: "b-3", name: "Tom Jenkins" },
]

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function NewContactPage() {
  const [side, setSide] = useState<ContactSide>("supply")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const typeOptions = side === "supply" ? SUPPLY_TYPES : DEMAND_TYPES

  function handleAddTag() {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput("")
    }
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div className="max-w-screen-md mx-auto px-6 py-6">
      {/* Back link */}
      <Link
        href="/admin/brokerage-mockups/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">New Contact</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new supply or demand contact to the brokerage platform.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Side Toggle */}
          <div>
            <Label className="mb-2 block">Contact Side</Label>
            <Tabs value={side} onValueChange={(v) => setSide(v as ContactSide)}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="supply" className="gap-1.5">
                  Supply
                </TabsTrigger>
                <TabsTrigger value="demand" className="gap-1.5">
                  Demand
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground mt-1.5">
              {side === "supply"
                ? "Landowners, farmers, land agents, and assessors who provide credits."
                : "Developers and housebuilders who purchase credits."}
            </p>
          </div>

          {/* Name & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="e.g. Robert Whiteley" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" placeholder="e.g. Whiteley Farm" className="mt-1.5" />
            </div>
          </div>

          {/* Role & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Role / Job Title</Label>
              <Input id="role" placeholder="e.g. Farm Owner" className="mt-1.5" />
            </div>
            <div>
              <Label>Contact Type</Label>
              <Select>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="e.g. robert@whiteleyfarm.co.uk" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="e.g. 01329 832145" className="mt-1.5" />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="e.g. Whiteley, Hampshire" className="mt-1.5" />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this contact..."
              className="mt-1.5 min-h-[100px]"
            />
          </div>

          {/* Assigned Broker */}
          <div>
            <Label>Assigned Broker</Label>
            <Select>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select broker..." />
              </SelectTrigger>
              <SelectContent>
                {BROKERS.map((broker) => (
                  <SelectItem key={broker.id} value={broker.id}>
                    {broker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Link href="/admin/brokerage-mockups/contacts">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button>
              <Save className="h-4 w-4" />
              Save Contact
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
