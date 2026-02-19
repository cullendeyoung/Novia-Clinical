import { useState, useRef, useCallback } from "react";
import RosterColumn from "./RosterColumn";
import EncounterColumn from "./EncounterColumn";
import MainContentArea from "./MainContentArea";

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_ROSTER_WIDTH = 288; // 18rem = 288px
const DEFAULT_ENCOUNTER_WIDTH = 320; // 20rem = 320px

export default function EMRView() {
  const [rosterWidth, setRosterWidth] = useState(DEFAULT_ROSTER_WIDTH);
  const [encounterWidth, setEncounterWidth] = useState(DEFAULT_ENCOUNTER_WIDTH);
  const [isDraggingRoster, setIsDraggingRoster] = useState(false);
  const [isDraggingEncounter, setIsDraggingEncounter] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;

      if (isDraggingRoster) {
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, mouseX));
        setRosterWidth(newWidth);
      } else if (isDraggingEncounter) {
        const newWidth = Math.max(
          MIN_WIDTH,
          Math.min(MAX_WIDTH, mouseX - rosterWidth)
        );
        setEncounterWidth(newWidth);
      }
    },
    [isDraggingRoster, isDraggingEncounter, rosterWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingRoster(false);
    setIsDraggingEncounter(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-1 overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Column 1: Roster */}
      <div style={{ width: rosterWidth, minWidth: rosterWidth }} className="flex-shrink-0">
        <RosterColumn />
      </div>

      {/* Resizer 1 */}
      <div
        className={`w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors flex-shrink-0 ${
          isDraggingRoster ? "bg-primary/50" : "bg-transparent"
        }`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDraggingRoster(true);
        }}
      />

      {/* Column 2: Encounter History */}
      <div style={{ width: encounterWidth, minWidth: encounterWidth }} className="flex-shrink-0">
        <EncounterColumn />
      </div>

      {/* Resizer 2 */}
      <div
        className={`w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors flex-shrink-0 ${
          isDraggingEncounter ? "bg-primary/50" : "bg-transparent"
        }`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDraggingEncounter(true);
        }}
      />

      {/* Column 3: Main Content Area */}
      <div className="flex-1 min-w-0">
        <MainContentArea />
      </div>
    </div>
  );
}
