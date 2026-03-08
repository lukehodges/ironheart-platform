"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Clock,
  Plug,
  ExternalLink,
} from "lucide-react"

const integrations = [
  {
    name: "Natural England Register",
    letter: "N",
    colour: "bg-emerald-600",
    description: "Sync BNG gain site registrations",
    connected: true,
    detail: "Last sync: 2 hours ago",
  },
  {
    name: "LPA Planning Portals",
    letter: "L",
    colour: "bg-blue-600",
    description: "Monitor planning applications",
    connected: true,
    detail: "3 LPAs connected",
  },
  {
    name: "Xero",
    letter: "X",
    colour: "bg-cyan-600",
    description: "Sync invoices and payments",
    connected: true,
    detail: "Last sync: 1 hour ago",
  },
  {
    name: "Outlook / Gmail",
    letter: "O",
    colour: "bg-amber-600",
    description: "Email tracking and logging",
    connected: true,
    detail: "3 accounts connected",
  },
  {
    name: "DocuSign",
    letter: "D",
    colour: "bg-purple-600",
    description: "Digital document signing and tracking",
    connected: false,
    detail: "Set up document signing workflows",
  },
  {
    name: "Ordnance Survey",
    letter: "O",
    colour: "bg-rose-600",
    description: "Map data and boundary verification",
    connected: false,
    detail: "Enable geospatial site verification",
  },
]

export default function SettingsIntegrationsPage() {
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
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect third-party services to enhance your brokerage workflow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <Card
            key={integration.name}
            className={`transition-colors ${
              !integration.connected
                ? "border-dashed opacity-80"
                : ""
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg ${integration.colour} flex items-center justify-center shrink-0`}
                >
                  <span className="text-white font-bold text-sm">
                    {integration.letter}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {integration.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        integration.connected
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {integration.connected
                        ? "Connected"
                        : "Not Connected"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {integration.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {integration.connected ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <Plug className="w-3 h-3" />
                      )}
                      {integration.detail}
                    </span>
                    <Button
                      variant={integration.connected ? "outline" : "default"}
                      size="sm"
                      className="gap-1.5"
                    >
                      {integration.connected ? (
                        <>
                          Configure
                          <ExternalLink className="w-3 h-3" />
                        </>
                      ) : (
                        "Connect"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-6 italic">
        Integrations are configurable per vertical.
      </p>
    </div>
  )
}
