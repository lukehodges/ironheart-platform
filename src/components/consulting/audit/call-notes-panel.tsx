"use client"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { FileText, Plus } from "lucide-react"

interface CallNote {
  id: string
  contactUserId: string
  rawNotes: string
  callDate: Date | null
  callDuration: number | null
  createdAt: Date
  updatedAt: Date
}

interface CallNotesPanelProps {
  callNotes: CallNote[]
  auditSessionId: string
  onSaveNotes: (data: {
    auditSessionId: string
    contactUserId: string
    rawNotes: string
    callDate?: Date | null
    callDuration?: number | null
  }) => void
  disabled?: boolean
}

export function CallNotesPanel({
  callNotes,
  auditSessionId,
  onSaveNotes,
  disabled,
}: CallNotesPanelProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    callNotes.length > 0 ? callNotes[0].contactUserId : null
  )
  const [addingNew, setAddingNew] = useState(false)
  const [newContactId, setNewContactId] = useState("")

  const selectedNote = callNotes.find((n) => n.contactUserId === selectedContactId)

  const handleAddContact = () => {
    if (!newContactId.trim()) return
    setSelectedContactId(newContactId.trim())
    setAddingNew(false)
    setNewContactId("")
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Left sidebar - contact list */}
      <div className="w-64 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Contacts</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setAddingNew(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-1">
          {callNotes.map((note) => (
            <button
              key={note.contactUserId}
              type="button"
              onClick={() => setSelectedContactId(note.contactUserId)}
              className={cn(
                "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                selectedContactId === note.contactUserId
                  ? "bg-zinc-900 text-white"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">
                  {note.contactUserId.slice(0, 8)}...
                </span>
                <span className="ml-2 flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Has notes" />
              </div>
              {note.callDate && (
                <p className="text-xs mt-0.5 opacity-70">
                  {new Date(note.callDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
            </button>
          ))}
          {/* Show selected contact that doesn't have notes yet */}
          {selectedContactId && !callNotes.find((n) => n.contactUserId === selectedContactId) && (
            <button
              type="button"
              className="w-full text-left rounded-md px-3 py-2 text-sm bg-zinc-900 text-white"
            >
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">
                  {selectedContactId.slice(0, 8)}...
                </span>
                <span className="ml-2 flex h-2 w-2 shrink-0 rounded-full bg-zinc-400" title="No notes yet" />
              </div>
            </button>
          )}
        </div>
        {addingNew && (
          <div className="space-y-2 pt-2">
            <Input
              placeholder="Contact user ID..."
              value={newContactId}
              onChange={(e) => setNewContactId(e.target.value)}
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-1">
              <Button size="sm" variant="default" onClick={handleAddContact} disabled={!newContactId.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setNewContactId("") }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {callNotes.length === 0 && !addingNew && (
          <p className="text-xs text-muted-foreground px-3 py-4">
            No call notes yet. Add a contact to start capturing notes.
          </p>
        )}
      </div>

      <Separator orientation="vertical" className="h-auto" />

      {/* Main area - notes editor */}
      <div className="flex-1 min-w-0">
        {selectedContactId ? (
          <NoteEditor
            key={selectedContactId}
            auditSessionId={auditSessionId}
            contactUserId={selectedContactId}
            existingNote={selectedNote ?? null}
            onSave={onSaveNotes}
            disabled={disabled}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Select a contact or add one to begin capturing notes.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NoteEditor({
  auditSessionId,
  contactUserId,
  existingNote,
  onSave,
  disabled,
}: {
  auditSessionId: string
  contactUserId: string
  existingNote: CallNote | null
  onSave: CallNotesPanelProps["onSaveNotes"]
  disabled?: boolean
}) {
  const [notes, setNotes] = useState(existingNote?.rawNotes ?? "")
  const [callDate, setCallDate] = useState(
    existingNote?.callDate ? new Date(existingNote.callDate).toISOString().split("T")[0] : ""
  )
  const [callDuration, setCallDuration] = useState(
    existingNote?.callDuration ? String(existingNote.callDuration) : ""
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSave = useCallback(
    (rawNotes: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onSave({
          auditSessionId,
          contactUserId,
          rawNotes,
          callDate: callDate ? new Date(callDate) : null,
          callDuration: callDuration ? parseInt(callDuration) : null,
        })
      }, 500)
    },
    [auditSessionId, contactUserId, callDate, callDuration, onSave]
  )

  const handleNotesChange = (value: string) => {
    setNotes(value)
    debouncedSave(value)
  }

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    onSave({
      auditSessionId,
      contactUserId,
      rawNotes: notes,
      callDate: callDate ? new Date(callDate) : null,
      callDuration: callDuration ? parseInt(callDuration) : null,
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Call Notes - {contactUserId.slice(0, 8)}...
        </CardTitle>
        <div className="flex gap-4 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Call Date</Label>
            <Input
              type="date"
              value={callDate}
              onChange={(e) => setCallDate(e.target.value)}
              onBlur={handleBlur}
              className="text-sm w-40"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Duration (mins)</Label>
            <Input
              type="number"
              value={callDuration}
              onChange={(e) => setCallDuration(e.target.value)}
              onBlur={handleBlur}
              placeholder="30"
              className="text-sm w-24"
              disabled={disabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Questionnaire Highlights</Label>
          <div className="rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground italic">
            Questionnaire responses will appear here once the integration is built.
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Raw Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="Type call notes here... Auto-saves as you type."
            rows={14}
            className="font-mono text-sm"
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  )
}
