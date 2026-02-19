import RosterColumn from "./RosterColumn";
import EncounterColumn from "./EncounterColumn";
import MainContentArea from "./MainContentArea";

export default function EMRView() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Column 1: Roster */}
      <RosterColumn />

      {/* Column 2: Encounter History */}
      <EncounterColumn />

      {/* Column 3: Main Content Area */}
      <MainContentArea />
    </div>
  );
}
