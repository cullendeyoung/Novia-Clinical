import { Outlet } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  const { data: session } = authClient.useSession();
  const clinician = useQuery(
    api.clinicians.getByUserId,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <Sidebar
        clinicianName={clinician?.fullName}
        practiceName={undefined} // Will be populated when practice is set up
      />
      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet context={{ clinician }} />
      </main>
    </div>
  );
}
