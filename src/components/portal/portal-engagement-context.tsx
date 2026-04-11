"use client";

import { createContext, useContext } from "react";
import type { EngagementRecord } from "@/modules/client-portal/client-portal.types";

interface PortalEngagementContextValue {
  engagement: EngagementRecord | null;
  engagementId: string;
  allEngagements: EngagementRecord[];
  isLoading: boolean;
  setEngagementId: (id: string) => void;
}

const PortalEngagementContext = createContext<PortalEngagementContextValue>({
  engagement: null,
  engagementId: "",
  allEngagements: [],
  isLoading: true,
  setEngagementId: () => {},
});

export const PortalEngagementProvider = PortalEngagementContext.Provider;

export function usePortalEngagement() {
  return useContext(PortalEngagementContext);
}
