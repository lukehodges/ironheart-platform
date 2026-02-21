"use client"

import * as React from "react"
import { api } from "@/lib/trpc/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar, Mail, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { IntegrationConnection } from "@/types/settings"

export default function IntegrationsTab() {
  const [disconnectProvider, setDisconnectProvider] = React.useState<string | null>(null)
  const [isConnecting, setIsConnecting] = React.useState(false)

  // TODO: Implement settings router with getIntegrations procedure
  // For now, stub the data to make build pass
  const isLoading = false
  const integrations = [] as IntegrationConnection[]
  const refetch = () => Promise.resolve()

  // Find specific providers
  const googleIntegration = integrations?.find((i) => i.provider === "google")
  const outlookIntegration = integrations?.find((i) => i.provider === "outlook")

  // Mock OAuth flow - in production, this would redirect to Google/Microsoft OAuth endpoints
  const handleConnect = async (provider: string) => {
    setIsConnecting(true)
    try {
      // Placeholder: In a real app, this would:
      // 1. Redirect to OAuth endpoint (Google/Microsoft)
      // 2. Handle callback with authorization code
      // 3. Exchange code for access token via backend
      // 4. Store token securely

      toast.info(`${provider === "google" ? "Google Calendar" : "Outlook"} connection coming soon`, {
        description: "OAuth flow will be implemented with backend integration",
      })

      // Simulate a small delay to show button feedback
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      toast.error("Connection failed", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  // Handle disconnect
  const handleDisconnect = async (provider: string) => {
    try {
      // In production, call api.settings.disconnectIntegration mutation
      toast.success("Integration disconnected", {
        description: `${provider === "google" ? "Google Calendar" : "Outlook"} has been disconnected`,
      })
      setDisconnectProvider(null)
      refetch()
    } catch (error) {
      toast.error("Failed to disconnect", {
        description: error instanceof Error ? error.message : "An error occurred",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Google Calendar Integration */}
      <IntegrationCard
        provider="google"
        name="Google Calendar"
        description="Sync bookings with your Google Calendar"
        icon={<Calendar className="h-5 w-5" />}
        connected={googleIntegration?.connected ?? false}
        connectedEmail={googleIntegration?.email}
        connectedAt={googleIntegration?.connectedAt}
        onConnect={() => handleConnect("google")}
        onDisconnect={() => setDisconnectProvider("google")}
        isConnecting={isConnecting}
      />

      {/* Outlook Integration */}
      <IntegrationCard
        provider="outlook"
        name="Outlook Calendar"
        description="Sync bookings with your Outlook Calendar"
        icon={<Mail className="h-5 w-5" />}
        connected={outlookIntegration?.connected ?? false}
        connectedEmail={outlookIntegration?.email}
        connectedAt={outlookIntegration?.connectedAt}
        onConnect={() => handleConnect("outlook")}
        onDisconnect={() => setDisconnectProvider("outlook")}
        isConnecting={isConnecting}
      />

      {/* Future Integrations Placeholder */}
      <div className="grid gap-4 md:grid-cols-2">
        <FutureIntegrationPlaceholder name="Stripe" icon="💳" description="Payment processing" />
        <FutureIntegrationPlaceholder name="Zapier" icon="⚡" description="Connect any app" />
      </div>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={disconnectProvider !== null} onOpenChange={(open) => !open && setDisconnectProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Integration?</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectProvider === "google"
                ? "Your Google Calendar will be disconnected. Synced events will no longer be updated."
                : "Your Outlook Calendar will be disconnected. Synced events will no longer be updated."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectProvider && handleDisconnect(disconnectProvider)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface IntegrationCardProps {
  provider: string
  name: string
  description: string
  icon: React.ReactNode
  connected: boolean
  connectedEmail?: string
  connectedAt?: Date
  onConnect: () => void
  onDisconnect: () => void
  isConnecting: boolean
}

function IntegrationCard({
  provider,
  name,
  description,
  icon,
  connected,
  connectedEmail,
  connectedAt,
  onConnect,
  onDisconnect,
  isConnecting,
}: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-primary">{icon}</div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge variant={connected ? "success" : "secondary"}>
            {connected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connected Email Display */}
        {connected && connectedEmail && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Connected email:</p>
            <p className="text-muted-foreground">{connectedEmail}</p>
            {connectedAt && (
              <p className="text-xs text-muted-foreground pt-2">
                Connected on {new Date(connectedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!connected ? (
            <Button onClick={onConnect} loading={isConnecting} className="gap-2">
              <Plus className="h-4 w-4" />
              Connect
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={onDisconnect}
              disabled={isConnecting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface FutureIntegrationPlaceholderProps {
  name: string
  icon: string
  description: string
}

function FutureIntegrationPlaceholder({
  name,
  icon,
  description,
}: FutureIntegrationPlaceholderProps) {
  return (
    <Card className="opacity-60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{icon}</div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
      </CardHeader>
    </Card>
  )
}
