"use client"

import * as React from "react"
import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useSettingsMutations } from "@/hooks/use-settings-mutations"
import { createApiKeySchema, type CreateApiKeyInput } from "@/schemas/settings.schemas"
import type { ApiKey } from "@/types/settings"
import { Loader2, Trash2, Copy, Check, Plus, Shield } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

/**
 * SecurityTab — API keys and webhooks management
 *
 * Features:
 * - API keys table with masking (shows only last 4 chars)
 * - Create API key dialog with name and expiry options
 * - Display new key once in dialog with copy-to-clipboard
 * - Revoke API key with confirmation dialog
 * - Webhook endpoints list (placeholder for Wave 8B.2)
 *
 * @example
 * ```tsx
 * <SecurityTab />
 * ```
 */
export function SecurityTab() {
  // TODO: Implement settings router with listApiKeys procedure
  // For now, stub the data to make build pass
  const isLoadingKeys = false
  const apiKeys = [] as ApiKey[]
  const mutations = useSettingsMutations()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateApiKeyInput>({
    name: "",
    expiresInDays: undefined,
  })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})

  // Track newly created key to show in dialog
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)

  // Track revoke confirmation state
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null)

  // Copy button state
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateErrors({})

    // Validate form using Zod schema
    const result = createApiKeySchema.safeParse(createForm)
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach((err) => {
        const field = err.path[0] as string
        newErrors[field] = err.message
      })
      setCreateErrors(newErrors)
      return
    }

    try {
      const response = await mutations.createApiKey.mutateAsync(createForm)
      // Response includes the full key (shown only once)
      setNewlyCreatedKey(response.key)
      setCreateForm({ name: "", expiresInDays: undefined })
    } catch {
      // Error handled by mutation's onError
    }
  }

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKeyId(key)
      toast.success("API key copied to clipboard")
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }

  const handleRevokeApiKey = async () => {
    if (!revokeKeyId) return

    try {
      await mutations.revokeApiKey.mutateAsync({ keyId: revokeKeyId })
      setRevokeKeyId(null)
    } catch {
      // Error handled by mutation's onError
    }
  }

  if (isLoadingKeys) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* API Keys Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              API Keys
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage API keys for programmatic access to the Ironheart API.
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  {newlyCreatedKey
                    ? "Save your API key now. You won't be able to see it again."
                    : "Create a new API key for programmatic access."}
                </DialogDescription>
              </DialogHeader>

              {newlyCreatedKey ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-2">Your API Key</p>
                    <div className="flex gap-2 items-center">
                      <code className="flex-1 break-all font-mono text-sm text-foreground">
                        {newlyCreatedKey}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyKey(newlyCreatedKey)}
                        className="flex-shrink-0"
                      >
                        {copiedKeyId === newlyCreatedKey ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-warning/50 bg-warning/5 p-3">
                    <p className="text-xs font-medium text-warning mb-1">Important</p>
                    <p className="text-xs text-muted-foreground">
                      Store this key in a secure location. You won&apos;t be able to retrieve it later.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      setIsCreateDialogOpen(false)
                      setNewlyCreatedKey(null)
                    }}
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateApiKey} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyName">
                      Key Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="apiKeyName"
                      type="text"
                      value={createForm.name}
                      onChange={(e) => {
                        setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                        if (createErrors.name) {
                          setCreateErrors((prev) => {
                            const next = { ...prev }
                            delete next.name
                            return next
                          })
                        }
                      }}
                      placeholder="e.g., Development, Production"
                      error={!!createErrors.name}
                      aria-invalid={!!createErrors.name}
                      aria-describedby={createErrors.name ? "name-error" : undefined}
                      disabled={mutations.createApiKey.isPending}
                      required
                    />
                    {createErrors.name && (
                      <p id="name-error" className="text-sm text-destructive">
                        {createErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresInDays">
                      Expiration
                    </Label>
                    <Select
                      value={createForm.expiresInDays?.toString() ?? ""}
                      onValueChange={(value) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          expiresInDays: value ? parseInt(value, 10) : undefined,
                        }))
                      }
                    >
                      <SelectTrigger
                        id="expiresInDays"
                        disabled={mutations.createApiKey.isPending}
                      >
                        <SelectValue placeholder="Never expires" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Never expires</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                    {createErrors.expiresInDays && (
                      <p id="expires-error" className="text-sm text-destructive">
                        {createErrors.expiresInDays}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={mutations.createApiKey.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={mutations.createApiKey.isPending}
                      loading={mutations.createApiKey.isPending}
                    >
                      Create
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {apiKeys && apiKeys.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey: ApiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      <code className="text-muted-foreground">
                        {apiKey.key.substring(0, apiKey.key.length - 4).replace(/./g, "•")}
                        {apiKey.key.slice(-4)}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {apiKey.lastUsedAt
                        ? formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true })
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {apiKey.expiresAt ? (
                        <span>
                          {formatDistanceToNow(new Date(apiKey.expiresAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <Badge variant="secondary">Never</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog open={revokeKeyId === apiKey.id} onOpenChange={(open) => {
                        if (!open) setRevokeKeyId(null)
                      }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRevokeKeyId(apiKey.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                                            <AlertDialogDescription>
                              This will immediately invalidate the API key &quot;{apiKey.name}&quot;. Any applications
                              using this key will no longer be able to access the API.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex gap-2 justify-end">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleRevokeApiKey}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={mutations.revokeApiKey.isPending}
                            >
                              {mutations.revokeApiKey.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Revoking...
                                </>
                              ) : (
                                "Revoke"
                              )}
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No API keys created yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create one to enable programmatic access to your account.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Webhook Endpoints Section (Placeholder for Wave 8B.2) */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Webhook Endpoints</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configure webhooks to receive real-time notifications of events.
            </p>
          </div>
          <Button variant="outline" className="gap-2" disabled>
            <Plus className="h-4 w-4" />
            Add Webhook
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">Webhook endpoints coming soon.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Configure webhooks to receive real-time event notifications.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
