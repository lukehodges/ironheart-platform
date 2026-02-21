'use client';

import * as React from 'react';
import { ZoomIn, ZoomOut, Maximize2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface WorkflowToolbarProps {
  /** Workflow name */
  workflowName: string;
  /** Selected trigger event */
  triggerEvent: string;
  /** Whether workflow is active */
  isActive: boolean;
  /** Number of validation errors */
  errorCount?: number;
  /** Number of validation warnings */
  warningCount?: number;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Callback when name changes */
  onNameChange: (name: string) => void;
  /** Callback when trigger event changes */
  onTriggerChange: (event: string) => void;
  /** Callback when save is clicked */
  onSave: () => void;
  /** Callback when active toggle changes */
  onToggleActive: (active: boolean) => void;
  /** Callback for zoom in */
  onZoomIn?: () => void;
  /** Callback for zoom out */
  onZoomOut?: () => void;
  /** Callback for fit view */
  onFitView?: () => void;
}

const TRIGGER_EVENTS = [
  { value: 'booking/created', label: 'Booking Created' },
  { value: 'booking/completed', label: 'Booking Completed' },
  { value: 'booking/cancelled', label: 'Booking Cancelled' },
  { value: 'booking/rescheduled', label: 'Booking Rescheduled' },
  { value: 'customer/created', label: 'Customer Created' },
  { value: 'review/submitted', label: 'Review Submitted' },
  { value: 'payment/received', label: 'Payment Received' },
  { value: 'payment/failed', label: 'Payment Failed' },
];

export const WorkflowToolbar = React.forwardRef<
  HTMLDivElement,
  WorkflowToolbarProps
>(
  (
    {
      workflowName,
      triggerEvent,
      isActive,
      errorCount = 0,
      warningCount = 0,
      isSaving = false,
      onNameChange,
      onTriggerChange,
      onSave,
      onToggleActive,
      onZoomIn,
      onZoomOut,
      onFitView,
    },
    ref
  ) => {
    const hasValidationIssues = errorCount > 0 || warningCount > 0;
    const validationStatus = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success';

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-4',
          'h-auto min-h-[72px] flex-wrap md:flex-nowrap'
        )}
      >
        {/* Left section: Name & Trigger */}
        <div className="flex flex-col gap-3 flex-1 min-w-0 md:flex-row md:items-end md:gap-4">
          {/* Workflow Name */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <Label htmlFor="workflow-name" className="text-xs font-medium">
              Workflow Name
            </Label>
            <Input
              id="workflow-name"
              value={workflowName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter workflow name..."
              className="h-9"
            />
          </div>

          {/* Trigger Event Selector */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
            <Label htmlFor="trigger-event" className="text-xs font-medium">
              Trigger Event
            </Label>
            <Select value={triggerEvent} onValueChange={onTriggerChange}>
              <SelectTrigger id="trigger-event" className="h-9">
                <SelectValue placeholder="Select trigger event..." />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_EVENTS.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    {event.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right section: Controls */}
        <div className="flex items-center justify-between gap-2 w-full md:w-auto md:justify-end flex-wrap md:flex-nowrap">
          {/* Validation Status Indicator */}
          <div className="flex items-center gap-2">
            {hasValidationIssues ? (
              <>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Valid</span>
              </Badge>
            )}
          </div>

          {/* Active/Inactive Toggle */}
          <div className="flex items-center gap-2">
            <Label
              htmlFor="workflow-active"
              className="text-xs font-medium cursor-pointer"
            >
              {isActive ? 'Active' : 'Inactive'}
            </Label>
            <Switch
              id="workflow-active"
              checked={isActive}
              onCheckedChange={onToggleActive}
            />
          </div>

          {/* Zoom Controls */}
          <div className="hidden lg:flex items-center gap-1 border-l border-border pl-2 ml-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onZoomIn}
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onZoomOut}
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onFitView}
              title="Fit view"
              aria-label="Fit to view"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Save Button */}
          <Button
            onClick={onSave}
            disabled={isSaving || errorCount > 0}
            loading={isSaving}
            className="whitespace-nowrap"
          >
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>
      </div>
    );
  }
);

WorkflowToolbar.displayName = 'WorkflowToolbar';

export default WorkflowToolbar;
