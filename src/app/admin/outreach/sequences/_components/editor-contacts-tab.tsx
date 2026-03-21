"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/trpc/react";

interface EditorContactsTabProps {
  sequenceId: string;
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  REPLIED: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  BOUNCED: "bg-red-100 text-red-700 hover:bg-red-100",
  OPTED_OUT: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  CONVERTED: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  PAUSED: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  COMPLETED: "bg-slate-200 text-slate-600 hover:bg-slate-200",
};

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function EditorContactsTab({ sequenceId }: EditorContactsTabProps) {
  const { data, isLoading } = api.outreach.listContacts.useQuery({
    sequenceId,
    limit: 50,
  });

  const contacts = data?.rows ?? [];

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Step</TableHead>
            <TableHead>Next Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No contacts enrolled in this sequence yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Step</TableHead>
          <TableHead>Next Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => (
          <TableRow key={contact.id}>
            <TableCell className="font-medium">
              {contact.customerFirstName} {contact.customerLastName}
            </TableCell>
            <TableCell>
              <Badge className={statusStyles[contact.status] ?? ""}>
                {contact.status}
              </Badge>
            </TableCell>
            <TableCell className="font-mono">{contact.currentStep}</TableCell>
            <TableCell>{formatDate(contact.nextDueAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
