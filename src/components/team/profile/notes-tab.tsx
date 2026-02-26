"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Pin, PinOff, Pencil, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

export function NotesTab({ memberId }: { memberId: string }) {
  const [newNote, setNewNote] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const utils = api.useUtils()

  const { data, isLoading } = api.team.notes.list.useQuery({
    userId: memberId,
    limit: 20,
    cursor,
  })

  const createMutation = api.team.notes.create.useMutation({
    onSuccess: () => {
      toast.success("Note added")
      setNewNote("")
      void utils.team.notes.list.invalidate({ userId: memberId })
    },
    onError: (err) => toast.error(err.message ?? "Failed to add note"),
  })

  const updateMutation = api.team.notes.update.useMutation({
    onSuccess: () => {
      toast.success("Note updated")
      setEditingId(null)
      setEditContent("")
      void utils.team.notes.list.invalidate({ userId: memberId })
    },
    onError: (err) => toast.error(err.message ?? "Failed to update note"),
  })

  const deleteMutation = api.team.notes.delete.useMutation({
    onSuccess: () => {
      toast.success("Note deleted")
      setDeleteId(null)
      void utils.team.notes.list.invalidate({ userId: memberId })
    },
    onError: (err) => toast.error(err.message ?? "Failed to delete note"),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const content = newNote.trim()
    if (!content) return
    createMutation.mutate({ userId: memberId, content })
  }

  function handleStartEdit(noteId: string, content: string) {
    setEditingId(noteId)
    setEditContent(content)
  }

  function handleSaveEdit(noteId: string) {
    const content = editContent.trim()
    if (!content) return
    updateMutation.mutate({ noteId, content })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditContent("")
  }

  function handleTogglePin(noteId: string, currentlyPinned: boolean) {
    updateMutation.mutate({ noteId, isPinned: !currentlyPinned })
  }

  if (isLoading) {
    return (
      <div className="py-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  const notes = data?.rows ?? []
  const hasMore = data?.hasMore ?? false
  const pinnedNotes = notes.filter((n) => n.isPinned)
  const unpinnedNotes = notes.filter((n) => !n.isPinned)

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Notes
          {notes.length > 0 && (
            <span className="ml-1.5 text-muted-foreground font-normal">({notes.length})</span>
          )}
        </h3>
      </div>

      {/* Add note form */}
      <form onSubmit={handleCreate} className="space-y-2">
        <Textarea
          placeholder="Write a note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!newNote.trim() || createMutation.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            Add note
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <EmptyState
          variant="documents"
          title="No notes"
          description="Add notes about this staff member for your team's reference."
        />
      ) : (
        <div className="space-y-4">
          {/* Pinned notes */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pinned
              </h4>
              <div className="space-y-2">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isEditing={editingId === note.id}
                    editContent={editContent}
                    onEditContentChange={setEditContent}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onTogglePin={handleTogglePin}
                    onDelete={setDeleteId}
                    isPending={updateMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Unpinned notes */}
          {unpinnedNotes.length > 0 && (
            <div className="space-y-2">
              {pinnedNotes.length > 0 && (
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes
                </h4>
              )}
              <div className="space-y-2">
                {unpinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isEditing={editingId === note.id}
                    editContent={editContent}
                    onEditContentChange={setEditContent}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onTogglePin={handleTogglePin}
                    onDelete={setDeleteId}
                    isPending={updateMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const lastNote = notes[notes.length - 1]
                  if (lastNote) setCursor(lastNote.id)
                }}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate({ noteId: deleteId })
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface NoteCardProps {
  note: {
    id: string
    authorName: string
    content: string
    isPinned: boolean
    createdAt: Date
  }
  isEditing: boolean
  editContent: string
  onEditContentChange: (content: string) => void
  onStartEdit: (noteId: string, content: string) => void
  onSaveEdit: (noteId: string) => void
  onCancelEdit: () => void
  onTogglePin: (noteId: string, currentlyPinned: boolean) => void
  onDelete: (noteId: string) => void
  isPending: boolean
}

function NoteCard({
  note,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onTogglePin,
  onDelete,
  isPending,
}: NoteCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border px-4 py-3",
        note.isPinned && "bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{note.authorName}</span>
            {note.isPinned && (
              <Badge variant="secondary" className="text-[10px]">Pinned</Badge>
            )}
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
              {format(new Date(note.createdAt), "d MMM yyyy HH:mm")}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2 pt-1">
              <Textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onSaveEdit(note.id)}
                  disabled={!editContent.trim() || isPending}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onTogglePin(note.id, note.isPinned)}
              aria-label={note.isPinned ? "Unpin note" : "Pin note"}
            >
              {note.isPinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onStartEdit(note.id, note.content)}
              aria-label="Edit note"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(note.id)}
              aria-label="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
