import { createContext, useContext } from "react";
import type { Id } from "../../convex/_generated/dataModel";

// Context for sharing selected team across AT pages
export interface ATContextType {
  selectedTeamId: Id<"teams"> | null;
  setSelectedTeamId: (id: Id<"teams"> | null) => void;
}

export const ATContext = createContext<ATContextType | null>(null);

export function useATContext() {
  const context = useContext(ATContext);
  if (!context) {
    throw new Error("useATContext must be used within ATDashboardLayout");
  }
  return context;
}
