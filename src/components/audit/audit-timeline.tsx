'use client';

import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, Loader2, FileText } from 'lucide-react';
import type { AuditLogEntry } from '@/types/audit-log';

export interface AuditTimelineProps {
  entries: AuditLogEntry[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

/**
 * Vertical timeline component displaying audit log entries
 * Shows newest entries first with expandable change diffs
 */
export function AuditTimeline({
  entries,
  hasMore,
  onLoadMore,
  isLoading,
}: AuditTimelineProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore]);

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'success';
      case 'updated':
        return 'info';
      case 'deleted':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getActorInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderChangesDiff = (
    changes: Array<{ field: string; before: unknown; after: unknown }> | undefined
  ) => {
    if (!changes || changes.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        {changes.map((change, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-md bg-destructive/10 p-2 text-xs">
              <div className="font-semibold text-destructive mb-1">Before</div>
              <div className="text-destructive/80 break-words">
                {typeof change.before === 'object'
                  ? JSON.stringify(change.before, null, 2)
                  : String(change.before)}
              </div>
            </div>
            <div className="rounded-md bg-success/10 p-2 text-xs">
              <div className="font-semibold text-success mb-1">After</div>
              <div className="text-success/80 break-words">
                {typeof change.after === 'object'
                  ? JSON.stringify(change.after, null, 2)
                  : String(change.after)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (entries.length === 0 && !isLoading) {
    return (
      <EmptyState
        icon={FileText}
        title="No audit entries"
        description="Audit log entries will appear here as changes are made to your resources."
        variant="documents"
      />
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, index) => (
        <div key={entry.id}>
          <Collapsible>
            <div className="group flex gap-4 py-4 px-4 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 transition-colors">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="h-3 w-3 rounded-full border-2 border-primary bg-primary/20" />
                {index < entries.length - 1 && (
                  <div className="h-12 w-0.5 bg-border my-2" />
                )}
              </div>

              {/* Entry content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3">
                  {/* Header row: Time, Actor, Action, Resource */}
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-3 flex-wrap flex-1">
                      {/* Timestamp */}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(entry.timestamp), {
                          addSuffix: true,
                        })}
                      </span>

                      {/* Actor avatar + name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src="" alt={entry.actor.name} />
                          <AvatarFallback>
                            {getActorInitials(entry.actor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground truncate">
                          {entry.actor.name}
                        </span>
                      </div>

                      {/* Action badge */}
                      <Badge
                        variant={getActionBadgeColor(entry.action)}
                        className="flex-shrink-0"
                      >
                        {entry.action.charAt(0).toUpperCase() +
                          entry.action.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Resource info */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {entry.resourceType.charAt(0).toUpperCase() +
                        entry.resourceType.slice(1)}
                    </span>
                    <span className="font-medium text-foreground">
                      {entry.resourceName || `#${entry.resourceId}`}
                    </span>
                  </div>

                  {/* Changes collapsible section */}
                  {entry.changes && entry.changes.length > 0 && (
                    <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors group/trigger w-fit">
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
                      View changes ({entry.changes.length})
                    </CollapsibleTrigger>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable changes section */}
            {entry.changes && entry.changes.length > 0 && (
              <CollapsibleContent className="px-4 pb-4">
                <div className="ml-7 rounded-md border border-border bg-muted/30 p-4 space-y-3">
                  {renderChangesDiff(entry.changes)}
                </div>
              </CollapsibleContent>
            )}
          </Collapsible>

          {index < entries.length - 1 && <Separator className="my-0" />}
        </div>
      ))}

      {/* Load more trigger area */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-8"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more entries...
            </div>
          ) : (
            <div className="h-1 w-1 rounded-full bg-border" />
          )}
        </div>
      )}
    </div>
  );
}
