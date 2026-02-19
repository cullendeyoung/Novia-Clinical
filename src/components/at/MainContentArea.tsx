import { useATContext } from "@/contexts/ATContext";
import AthleteProfile from "./AthleteProfile";
import EncounterDetail from "./EncounterDetail";
import NewEncounterForm from "./NewEncounterForm";
import RehabProgramForm from "./RehabProgramForm";
import ATWelcome from "./ATWelcome";

export default function MainContentArea() {
  const { selectedAthleteId, selectedEncounterId, viewMode } = useATContext();

  // No athlete selected - show welcome/dashboard
  // If viewMode is "start-document", ATWelcome will show the start document form expanded
  if (!selectedAthleteId) {
    return <ATWelcome showStartDocumentInitially={viewMode === "start-document"} />;
  }

  // Show based on view mode
  switch (viewMode) {
    case "profile":
      return <AthleteProfile />;
    case "encounter":
      return selectedEncounterId ? <EncounterDetail /> : <AthleteProfile />;
    case "new-encounter":
      return <NewEncounterForm />;
    case "rehab-program":
      return <RehabProgramForm />;
    default:
      return <AthleteProfile />;
  }
}
