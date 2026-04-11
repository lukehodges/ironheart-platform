"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/trpc/react";

export default function PortalPreviewPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = use(params);
  const [status, setStatus] = useState<"loading" | "error">("loading");

  const mutation = api.clientPortal.admin.createPreviewSession.useMutation({
    onSuccess: (data) => {
      document.cookie = `portal_session=${data.sessionToken}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
      window.location.href = "/portal/dashboard";
    },
    onError: () => setStatus("error"),
  });

  useEffect(() => {
    mutation.mutate({ engagementId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Failed to create preview session. Make sure you are logged in as an admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Opening client portal...</p>
    </div>
  );
}
