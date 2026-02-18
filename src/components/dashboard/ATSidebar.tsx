import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  Calendar,
  Mic,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NoviaLogo from "@/components/ui/NoviaLogo";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const navigation = [
  { name: "Dashboard", href: "/at", icon: LayoutDashboard },
  { name: "Athletes", href: "/at/athletes", icon: Users },
  { name: "Injuries", href: "/at/injuries", icon: Activity },
  { name: "Encounters", href: "/at/encounters", icon: FileText },
  { name: "Daily Status", href: "/at/daily-status", icon: Calendar },
  { name: "Ambient Notes", href: "/at/ambient", icon: Mic },
];

interface ATSidebarProps {
  organizationName?: string;
  userName?: string;
  selectedTeamId?: Id<"teams"> | null;
  onTeamChange?: (teamId: Id<"teams"> | null) => void;
}

export default function ATSidebar({
  organizationName,
  userName,
  selectedTeamId,
  onTeamChange,
}: ATSidebarProps) {
  const location = useLocation();
  const teams = useQuery(api.teams.list, {});

  const selectedTeam = teams?.find((t) => t._id === selectedTeamId);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Organization Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <NoviaLogo className="h-8 w-auto" />
        </div>
        <div className="mt-3">
          <p className="truncate text-sm font-medium text-slate-900">
            {organizationName || "My Organization"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {userName || "Athletic Trainer"}
          </p>
        </div>
      </div>

      {/* Team Selector */}
      <div className="border-b border-slate-200 p-3">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Active Team
        </label>
        <div className="relative mt-1">
          <select
            value={selectedTeamId || "all"}
            onChange={(e) =>
              onTeamChange?.(
                e.target.value === "all" ? null : (e.target.value as Id<"teams">)
              )
            }
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Teams</option>
            {teams?.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        {selectedTeam && (
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedTeam.sport} • {selectedTeam.season}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/at" && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-blue-50 p-3">
          <p className="text-xs font-medium text-primary">Athletic Trainer Portal</p>
          <p className="mt-1 text-xs text-muted-foreground">
            EMR & Documentation
          </p>
        </div>
      </div>
    </aside>
  );
}
