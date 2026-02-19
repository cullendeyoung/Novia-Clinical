import { createContext, useContext } from "react";
import type { Id } from "../../convex/_generated/dataModel";

// Top-level page navigation
export type ATPage = "my-dashboard" | "team-overview" | "emr";

// View modes for the EMR main content area
export type ATViewMode = "dashboard" | "encounter" | "profile" | "new-encounter" | "start-document";

// Context for sharing state across AT portal
export interface ATContextType {
  // Current page
  currentPage: ATPage;
  setCurrentPage: (page: ATPage) => void;
  // Team selection
  selectedTeamId: Id<"teams"> | null;
  setSelectedTeamId: (id: Id<"teams"> | null) => void;
  // Athlete selection (EMR only)
  selectedAthleteId: Id<"athletes"> | null;
  setSelectedAthleteId: (id: Id<"athletes"> | null) => void;
  // Encounter selection (EMR only)
  selectedEncounterId: Id<"encounters"> | null;
  setSelectedEncounterId: (id: Id<"encounters"> | null) => void;
  // View mode (EMR only)
  viewMode: ATViewMode;
  setViewMode: (mode: ATViewMode) => void;
}

export const ATContext = createContext<ATContextType | null>(null);

export function useATContext() {
  const context = useContext(ATContext);
  if (!context) {
    throw new Error("useATContext must be used within ATDashboardLayout");
  }
  return context;
}
