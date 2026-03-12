"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { api } from "@/lib/trpc/react"
import {
  Bot,
  User,
  Send,
  Loader2,
  Plus,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Archive,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolCallRecord {
  id: string
  name: string
  input: unknown
}

interface ToolResultRecord {
  toolCallId: string
  output: unknown
  error?: string
}

interface TokenUsage {
  inputTokens: number
  outputTokens: number
  model: string
}

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  toolCalls: ToolCallRecord[] | null
  toolResults: ToolResultRecord[] | null
  tokenUsage: TokenUsage | null
  createdAt: Date
}

interface Conversation {
  id: string
  title: string | null
  status: "active" | "archived"
  tokenCount: number
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Tool Call Visualization
// ---------------------------------------------------------------------------

function ToolCallDisplay({
  toolCalls,
  toolResults,
}: {
  toolCalls: ToolCallRecord[]
  toolResults: ToolResultRecord[] | null
}) {
  if (toolCalls.length === 0) return null

  const resultMap = new Map(
    (toolResults ?? []).map((r) => [r.toolCallId, r])
  )

  return (
    <div className="space-y-1.5 my-2">
      {toolCalls.map((tc) => {
        const result = resultMap.get(tc.id)
        const hasError = result?.error
        return (
          <div key={tc.id}>
            <div className="flex items-start gap-2 text-xs">
              <div className="mt-0.5 shrink-0">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/60 bg-primary/10" />
              </div>
              <span className="font-mono text-foreground">
                {tc.name}({formatInput(tc.input)})
              </span>
            </div>
            {result && (
              <div className="flex items-start gap-2 text-xs ml-0">
                <div className="mt-0.5 shrink-0">
                  {hasError ? (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </div>
                <span
                  className={
                    hasError
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-emerald-700 dark:text-emerald-400"
                  }
                >
                  {hasError ? `Error: ${result.error}` : "Done"}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatInput(input: unknown): string {
  if (input == null) return ""
  try {
    const s = JSON.stringify(input)
    return s.length > 80 ? s.slice(0, 77) + "..." : s
  } catch {
    return "..."
  }
}

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div className={`px-4 py-4 ${isUser ? "bg-muted/30" : ""}`}>
      <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback
            className={`text-xs ${isUser ? "bg-foreground/10" : "bg-primary/10"}`}
          >
            {isUser ? (
              <User className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4 text-primary" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className={`flex-1 min-w-0 ${isUser ? "text-right" : ""}`}>
          <div
            className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : ""}`}
          >
            {isUser ? (
              <>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.createdAt)}
                </span>
                <span className="text-xs font-medium text-foreground">You</span>
              </>
            ) : (
              <>
                <span className="text-xs font-medium text-foreground">
                  AI Assistant
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.createdAt)}
                </span>
              </>
            )}
          </div>
          {isUser ? (
            <div className="inline-block text-left rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
              {message.content}
            </div>
          ) : (
            <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
              {message.toolCalls && message.toolCalls.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground italic mb-2">
                    Reasoning across modules...
                  </p>
                  <ToolCallDisplay
                    toolCalls={message.toolCalls}
                    toolResults={message.toolResults}
                  />
                  {message.content && <Separator className="my-3" />}
                </>
              )}
              {message.content && (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {message.content}
                </p>
              )}
              {message.tokenUsage && (
                <p className="text-xs text-muted-foreground mt-2">
                  {message.tokenUsage.inputTokens + message.tokenUsage.outputTokens}{" "}
                  tokens
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ---------------------------------------------------------------------------
// Loading Indicator
// ---------------------------------------------------------------------------

function LoadingBubble() {
  return (
    <div className="px-4 py-4">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-xs">
            <Bot className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-foreground">
              AI Assistant
            </span>
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conversation Sidebar
// ---------------------------------------------------------------------------

function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onArchive,
  isLoading,
}: {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onArchive: (id: string) => void
  isLoading: boolean
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNew}
          variant="outline"
          size="sm"
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  conv.id === activeId
                    ? "border-primary/30 bg-primary/5"
                    : "border-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground truncate">
                    {conv.title ?? "New conversation"}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {conv.id === activeId && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        Active
                      </Badge>
                    )}
                    {conv.status === "active" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onArchive(conv.id)
                        }}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        title="Archive"
                      >
                        <Archive className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(conv.updatedAt).toLocaleDateString()} &middot;{" "}
                  {conv.tokenCount.toLocaleString()} tokens
                </p>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AIChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // tRPC queries
  const conversationsQuery = api.ai.listConversations.useQuery(
    { limit: 20 },
    { refetchOnWindowFocus: false }
  )

  const conversationQuery = api.ai.getConversation.useQuery(
    { conversationId: activeConversationId! },
    {
      enabled: !!activeConversationId,
      refetchOnWindowFocus: false,
    }
  )

  const archiveMutation = api.ai.archiveConversation.useMutation({
    onSuccess: () => {
      conversationsQuery.refetch()
      if (activeConversationId) {
        setActiveConversationId(null)
        setMessages([])
      }
    },
  })

  const sendMutation = api.ai.sendMessage.useMutation({
    onSuccess: (data) => {
      // Add assistant response to messages
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          role: "assistant" as const,
          content: data.content,
          toolCalls: data.toolCalls,
          toolResults: data.toolResults,
          tokenUsage: data.tokenUsage,
          createdAt: new Date(),
        },
      ])
      // Set conversation ID if new
      if (!activeConversationId) {
        setActiveConversationId(data.conversationId)
      }
      conversationsQuery.refetch()
    },
  })

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationQuery.data?.messages) {
      setMessages(
        conversationQuery.data.messages.map((m: Message) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        }))
      )
    }
  }, [conversationQuery.data])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sendMutation.isPending])

  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text || sendMutation.isPending) return

    // Optimistically add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        role: "user" as const,
        content: text,
        toolCalls: null,
        toolResults: null,
        tokenUsage: null,
        createdAt: new Date(),
      },
    ])

    setInputValue("")

    sendMutation.mutate({
      conversationId: activeConversationId ?? undefined,
      message: text,
      pageContext: {
        route: "/admin/ai-chat",
      },
    })
  }, [inputValue, activeConversationId, sendMutation])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
    setInputValue("")
  }

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id)
    setMessages([])
  }

  const handleArchive = (id: string) => {
    archiveMutation.mutate({ conversationId: id })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <Card className="w-72 shrink-0 overflow-hidden flex flex-col">
        <CardHeader className="pb-0 pt-3 px-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Conversations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ConversationSidebar
            conversations={(conversationsQuery.data?.rows as Conversation[]) ?? []}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            onArchive={handleArchive}
            isLoading={conversationsQuery.isLoading}
          />
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                {activeConversationId
                  ? conversationQuery.data?.title ?? "Conversation"
                  : "New Conversation"}
              </CardTitle>
            </div>
            <Badge variant="outline" className="gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Read-only mode
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/50">
              {messages.length === 0 && !sendMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Bot className="h-10 w-10 mb-3 text-primary/40" />
                  <p className="text-sm font-medium">
                    Ask anything about your data
                  </p>
                  <p className="text-xs mt-1">
                    Bookings, customers, schedules, reviews, payments, workflows,
                    teams
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
              {sendMutation.isPending && <LoadingBubble />}
              {sendMutation.isError && (
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {sendMutation.error?.message ?? "Failed to send message"}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your portfolio, sites, deals, or compliance..."
                className="flex-1 resize-none rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 min-h-[42px] max-h-[120px]"
                rows={1}
                disabled={sendMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || sendMutation.isPending}
                size="sm"
                className="h-[42px] w-[42px] p-0 rounded-xl shrink-0"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
