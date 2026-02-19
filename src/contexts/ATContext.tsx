import { createContext, useContext } from "react";
import type { Id } from "../../convex/_generated/dataModel";

// View modes for the main content area
export type ATViewMode = "dashboard" | "encounter" | "profile" | "new-encounter";

// Context for sharing state across AT portal
export interface ATContextType {
  // Team selection
  selectedTeamId: Id<"teams"> | null;
  setSelectedTeamId: (id: Id<"teams"> | null) => void;
  // Athlete selection
  selectedAthleteId: Id<"athletes"> | null;
  setSelectedAthleteId: (id: Id<"athletes"> | null) => void;
  // Encounter selection
  selectedEncounterId: Id<"encounters"> | null;
  setSelectedEncounterId: (id: Id<"encounters"> | null) => void;
  // View mode
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
