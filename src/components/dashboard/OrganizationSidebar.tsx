import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Settings,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NoviaLogo from "@/components/ui/NoviaLogo";

const navigation = [
  { name: "Dashboard", href: "/org", icon: LayoutDashboard },
  { name: "Teams", href: "/org/teams", icon: UsersRound },
  { name: "Athletic Trainers", href: "/org/staff", icon: Users },
  { name: "Settings", href: "/org/settings", icon: Settings },
];

interface OrganizationSidebarProps {
  organizationName?: string;
  userName?: string;
}

export default function OrganizationSidebar({
  organizationName,
  userName,
}: OrganizationSidebarProps) {
  const location = useLocation();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Organization Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <NoviaLogo className="h-8 w-auto" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {organizationName || "My Organization"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {userName || "Admin"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/org" && location.pathname.startsWith(item.href));

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
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Organization Admin</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage teams and staff
          </p>
        </div>
      </div>
    </aside>
  );
}
