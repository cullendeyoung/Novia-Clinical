import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Plus,
  Users,
  UsersRound,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Session", href: "/dashboard/new-session", icon: Plus },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Team", href: "/dashboard/team", icon: UsersRound },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  clinicianName?: string;
  practiceName?: string;
}

export default function Sidebar({ clinicianName, practiceName }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Practice/Clinician Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <img
              src="/novia-logo.png"
              alt="Novia"
              className="h-6 w-auto"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {practiceName || clinicianName || "My Practice"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {practiceName ? clinicianName : "Solo Practice"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/dashboard" &&
              location.pathname.startsWith(item.href));

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

      {/* Quick Stats Footer */}
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">This Month</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
          <p className="text-xs text-muted-foreground">notes generated</p>
        </div>
      </div>
    </aside>
  );
}
