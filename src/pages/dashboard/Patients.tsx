import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Patients
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your patient records and documentation
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search patients by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Empty State */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-medium text-slate-900">No patients yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first patient to start documenting clinical notes
          </p>
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Patient
          </Button>
        </div>
      </div>
    </div>
  );
}
