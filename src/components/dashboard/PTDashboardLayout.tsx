import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  LogOut,
  ArrowLeft,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Calendar,
  Building2,
  Lock,
  ClipboardList,
  Search,
  ChevronRight,
  MessageSquare,
  Clock,
  Activity,
  FolderOpen,
  Receipt,
  User,
  ChevronDown,
  X,
  HelpCircle,
  Mic,
  MicOff,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Edit3,
  Dumbbell,
} from "lucide-react";
import NoviaLogo from "@/components/ui/NoviaLogo";
import { cn } from "@/lib/utils";
import { HumanBodyDiagram, PatientAnalytics } from "./HumanBodyDiagram";
import Schedule from "@/pages/dashboard/Schedule";
import Patients from "@/pages/dashboard/Patients";

// PT Portal page types - top nav pages
type PTPage = "dashboard" | "patients" | "schedule" | "emr" | "documents" | "admin" | "settings";

// EMR sidebar navigation sections
type EMRSection = "overview" | "cases" | "encounters" | "documents" | "billing";

// AI Capture states
type AICaptureStep = "idle" | "recording" | "processing" | "review";

// Parsed note structure from AI
interface ParsedNote {
  patientName: string;
  patientMatch: typeof MOCK_PATIENTS[0] | null;
  encounterType: string;
  caseTitle: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  exercises: string[];
  summary: string;
  confidence: number;
}

// Stored encounter structure
interface StoredEncounter {
  id: string;
  patientId: string;
  encounterType: string;
  caseTitle: string;
  date: string;
  provider: string;
  status: "Draft" | "Signed" | "Pending";
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  exercises: string[];
  summary: string;
  createdAt: number;
}

const NAV_ITEMS: { id: PTPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "emr", label: "EMR", icon: ClipboardList },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "admin", label: "Admin", icon: Building2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const EMR_SIDEBAR_ITEMS: { id: EMRSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "cases", label: "Cases", icon: FolderOpen },
  { id: "encounters", label: "Encounters", icon: ClipboardList },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "billing", label: "Billing", icon: Receipt },
];

// Encounter types for PT
const ENCOUNTER_TYPES = [
  "Initial Evaluation",
  "Follow-up",
  "Re-evaluation",
  "Discharge",
  "Progress Note",
  "Daily Note",
];

// Injury location type for body diagram
interface PatientInjury {
  id: string;
  area: string;
  x: number;
  y: number;
  severity: "mild" | "moderate" | "severe";
  diagnosis: string;
  metrics?: Array<{
    exercise: string;
    value: number;
    unit: string;
    comparison?: { baseline?: number; goal?: number };
    date: string;
  }>;
}

// Body imbalance data type
interface PatientImbalance {
  exercise: string;
  leftSide: number;
  rightSide: number;
  imbalancePercent: number;
  trend: "improving" | "declining" | "stable";
}

// Analytics data type
interface PatientAnalyticsData {
  painTrend: Array<{ date: string; value: number }>;
  romTrend: Array<{ date: string; value: number }>;
  strengthTrend: Array<{ date: string; value: number }>;
  functionalScore: number;
  visitCount: number;
  progressPercentage: number;
}

// Mock patient data for demo with more details
const MOCK_PATIENTS = [
  {
    id: "1",
    name: "Sarah Johnson",
    dob: "1985-03-15",
    lastVisit: "2024-01-10",
    status: "active",
    activeCase: "Lumbar Disc Herniation",
    cases: ["Lumbar Disc Herniation", "Previous: Knee Sprain (2022)"],
    history: "6 visits for lumbar disc. Showing good progress with conservative management.",
    injuries: [
      {
        id: "inj-1",
        area: "Lower Back (L4-L5)",
        x: 100,
        y: 145,
        severity: "moderate" as const,
        diagnosis: "Lumbar Disc Herniation L4-L5",
        metrics: [
          { exercise: "knee-extension", value: 82, unit: "Nm", comparison: { baseline: 70, goal: 100 }, date: "Jan 10" },
          { exercise: "hip-flexion", value: 68, unit: "Nm", comparison: { baseline: 55, goal: 85 }, date: "Jan 10" },
        ],
      },
    ] as PatientInjury[],
    imbalanceData: [
      { exercise: "knee-extension", leftSide: 82, rightSide: 85, imbalancePercent: 4, trend: "improving" as const },
      { exercise: "hip-flexion", leftSide: 68, rightSide: 72, imbalancePercent: 6, trend: "stable" as const },
    ] as PatientImbalance[],
    analytics: {
      painTrend: [
        { date: "Dec 15", value: 7 },
        { date: "Dec 22", value: 6 },
        { date: "Dec 29", value: 5 },
        { date: "Jan 5", value: 4 },
        { date: "Jan 10", value: 4 },
      ],
      romTrend: [
        { date: "Dec 15", value: 45 },
        { date: "Dec 29", value: 60 },
        { date: "Jan 10", value: 75 },
      ],
      strengthTrend: [
        { date: "Dec 15", value: 55 },
        { date: "Dec 22", value: 62 },
        { date: "Dec 29", value: 70 },
        { date: "Jan 5", value: 78 },
        { date: "Jan 10", value: 82 },
      ],
      functionalScore: 72,
      visitCount: 6,
      progressPercentage: 65,
    } as PatientAnalyticsData,
  },
  {
    id: "2",
    name: "Michael Chen",
    dob: "1992-07-22",
    lastVisit: "2024-01-08",
    status: "active",
    activeCase: "Rotator Cuff Tendinitis",
    cases: ["Rotator Cuff Tendinitis"],
    history: "3 visits for right shoulder. Overhead athlete, baseball pitcher.",
    injuries: [
      {
        id: "inj-2",
        area: "Right Shoulder",
        x: 135,
        y: 72,
        severity: "moderate" as const,
        diagnosis: "Rotator Cuff Tendinitis (Supraspinatus)",
        metrics: [
          { exercise: "hip-abduction", value: 45, unit: "Nm", comparison: { baseline: 38, goal: 60 }, date: "Jan 8" },
        ],
      },
    ] as PatientInjury[],
    imbalanceData: [
      { exercise: "hip-abduction", leftSide: 58, rightSide: 45, imbalancePercent: 22, trend: "improving" as const },
    ] as PatientImbalance[],
    analytics: {
      painTrend: [
        { date: "Dec 28", value: 7 },
        { date: "Jan 3", value: 6 },
        { date: "Jan 8", value: 5 },
      ],
      romTrend: [
        { date: "Dec 28", value: 70 },
        { date: "Jan 8", value: 85 },
      ],
      strengthTrend: [
        { date: "Dec 28", value: 38 },
        { date: "Jan 3", value: 42 },
        { date: "Jan 8", value: 45 },
      ],
      functionalScore: 68,
      visitCount: 3,
      progressPercentage: 45,
    } as PatientAnalyticsData,
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    dob: "1978-11-30",
    lastVisit: "2024-01-05",
    status: "active",
    activeCase: "Post-op ACL Reconstruction",
    cases: ["Post-op ACL Reconstruction", "Meniscus Repair"],
    history: "8 weeks post-op left ACL reconstruction. Progressing through protocol.",
    injuries: [
      {
        id: "inj-3",
        area: "Left Knee",
        x: 77,
        y: 270,
        severity: "severe" as const,
        diagnosis: "Post-op ACL Reconstruction (Hamstring Autograft)",
        metrics: [
          { exercise: "knee-extension", value: 65, unit: "Nm", comparison: { baseline: 45, goal: 95 }, date: "Jan 5" },
          { exercise: "knee-flexion", value: 48, unit: "Nm", comparison: { baseline: 32, goal: 75 }, date: "Jan 5" },
          { exercise: "cmj", value: 18, unit: "cm", comparison: { baseline: 12, goal: 35 }, date: "Jan 5" },
          { exercise: "single-leg-hop", value: 62, unit: "cm", comparison: { baseline: 45, goal: 95 }, date: "Jan 5" },
        ],
      },
    ] as PatientInjury[],
    imbalanceData: [
      { exercise: "knee-extension", leftSide: 65, rightSide: 92, imbalancePercent: 29, trend: "improving" as const },
      { exercise: "knee-flexion", leftSide: 48, rightSide: 72, imbalancePercent: 33, trend: "improving" as const },
      { exercise: "cmj", leftSide: 18, rightSide: 32, imbalancePercent: 44, trend: "improving" as const },
      { exercise: "single-leg-hop", leftSide: 62, rightSide: 95, imbalancePercent: 35, trend: "improving" as const },
    ] as PatientImbalance[],
    analytics: {
      painTrend: [
        { date: "Nov 15", value: 8 },
        { date: "Nov 29", value: 6 },
        { date: "Dec 15", value: 4 },
        { date: "Dec 29", value: 3 },
        { date: "Jan 5", value: 2 },
      ],
      romTrend: [
        { date: "Nov 15", value: 30 },
        { date: "Nov 29", value: 55 },
        { date: "Dec 15", value: 75 },
        { date: "Dec 29", value: 88 },
        { date: "Jan 5", value: 92 },
      ],
      strengthTrend: [
        { date: "Nov 15", value: 25 },
        { date: "Nov 29", value: 35 },
        { date: "Dec 15", value: 48 },
        { date: "Dec 29", value: 58 },
        { date: "Jan 5", value: 65 },
      ],
      functionalScore: 58,
      visitCount: 12,
      progressPercentage: 55,
    } as PatientAnalyticsData,
  },
  {
    id: "4",
    name: "James Wilson",
    dob: "1965-05-18",
    lastVisit: "2023-12-20",
    status: "discharged",
    activeCase: "Cervical Radiculopathy",
    cases: ["Cervical Radiculopathy (Discharged)"],
    history: "Completed 12 visits. Discharged with home program.",
    injuries: [] as PatientInjury[],
    imbalanceData: [] as PatientImbalance[],
    analytics: {
      painTrend: [
        { date: "Oct 1", value: 7 },
        { date: "Oct 15", value: 5 },
        { date: "Nov 1", value: 3 },
        { date: "Nov 15", value: 2 },
        { date: "Dec 20", value: 0 },
      ],
      romTrend: [
        { date: "Oct 1", value: 60 },
        { date: "Nov 1", value: 85 },
        { date: "Dec 20", value: 100 },
      ],
      strengthTrend: [
        { date: "Oct 1", value: 70 },
        { date: "Oct 15", value: 80 },
        { date: "Nov 1", value: 90 },
        { date: "Dec 20", value: 100 },
      ],
      functionalScore: 98,
      visitCount: 12,
      progressPercentage: 100,
    } as PatientAnalyticsData,
  },
];

// Mock note templates based on patient and encounter type
function generateNoteForPatient(
  patient: typeof MOCK_PATIENTS[0],
  encounterType: string,
  caseTitle: string
): Omit<ParsedNote, 'patientName' | 'patientMatch' | 'confidence'> {
  // Generate contextual notes based on patient history and case
  const noteTemplates: Record<string, Record<string, Partial<ParsedNote>>> = {
    "Sarah Johnson": {
      "Lumbar Disc Herniation": {
        subjective: "Patient reports pain decreased from 6/10 to 4/10 since last visit. Sleeping better, able to sit for longer periods. Still has some discomfort with prolonged standing.",
        objective: "Flexion ROM improved to 45 degrees (was 30). Extension still limited to 10 degrees. Tenderness reduced over L4-L5. SLR negative bilaterally. Core activation improved.",
        assessment: "Patient showing good progress with conservative management. Pain reduction and improved ROM indicate positive response to current treatment approach.",
        plan: "Continue current exercise program. Progress to standing stabilization exercises. Re-evaluate in 1 week. Patient to continue home program daily.",
        exercises: ["Prone press-ups - 3 sets of 10", "Bird dogs - 3 sets of 10 each side", "McGill curl-ups - 3 sets of 10", "Supine piriformis stretch - 30 sec hold x 3"],
        summary: "Follow-up visit for lumbar disc herniation. Patient improving with decreased pain and increased ROM. Continuing conservative treatment with progression of exercises.",
      },
    },
    "Michael Chen": {
      "Rotator Cuff Tendinitis": {
        subjective: "Patient reports right shoulder pain improved from 7/10 to 5/10. Less pain with overhead activities. Still experiencing discomfort during pitching motion.",
        objective: "Active ROM: Flexion 165°, Abduction 160°, ER 85°, IR 70°. Strength 4/5 supraspinatus, 4+/5 infraspinatus. Positive Hawkins-Kennedy, negative empty can.",
        assessment: "Rotator cuff tendinitis improving. Inflammation decreasing with modified activity and therapeutic exercises. Ready to begin sport-specific rehabilitation.",
        plan: "Progress to eccentric loading exercises. Begin interval throwing program. Continue ice after activity. Follow up in 1 week.",
        exercises: ["External rotation with band - 3x15", "Prone Y's and T's - 3x12", "Scapular retraction - 3x15", "Sleeper stretch - 30 sec x 3"],
        summary: "Follow-up for right rotator cuff tendinitis. Patient is an overhead athlete (baseball pitcher). Progressing well, beginning sport-specific rehab phase.",
      },
    },
    "Emily Rodriguez": {
      "Post-op ACL Reconstruction": {
        subjective: "Patient reports left knee feeling more stable. Able to walk without limp. Some stiffness in the morning that resolves with movement. No giving way episodes.",
        objective: "ROM: Flexion 125° (goal 135°), Extension 0°. Quad strength 4-/5. No effusion. Patellar mobility normal. Single leg stance 30 seconds with minimal sway.",
        assessment: "8 weeks post-op left ACL reconstruction with hamstring autograft. Meeting protocol milestones. Ready for progression to phase 3 activities.",
        plan: "Begin step-ups and lateral movements. Progress closed chain strengthening. Continue home program. Pool exercises approved. Follow up in 2 weeks.",
        exercises: ["Mini squats - 3x15", "Step-ups 4 inch - 3x12 each", "Stationary bike 15 min", "Quad sets with straight leg raise - 3x15", "Heel slides - 3x20"],
        summary: "8-week post-op follow-up for left ACL reconstruction. Patient progressing well through protocol. Advancing to phase 3 rehabilitation activities.",
      },
      "Meniscus Repair": {
        subjective: "Left knee stiffness improving. Weight bearing as tolerated without pain. Following precautions for meniscus protection.",
        objective: "ROM progressing. Joint line tenderness resolved. Following meniscus repair protocol restrictions.",
        assessment: "Meniscus repair healing appropriately. No signs of re-injury or complications.",
        plan: "Continue restricted ROM exercises per protocol. Avoid deep squatting. Progress weight bearing as tolerated.",
        exercises: ["Gentle ROM exercises", "Quad sets", "Ankle pumps", "Straight leg raises with brace"],
        summary: "Follow-up for meniscus repair. Healing well with appropriate restrictions in place.",
      },
    },
    "James Wilson": {
      "Cervical Radiculopathy": {
        subjective: "Patient reports neck pain and right arm symptoms have resolved. Able to perform daily activities without limitation. Numbness in right hand completely gone.",
        objective: "Cervical ROM full and pain-free. Upper extremity strength 5/5 throughout. Negative Spurling's test. Sensation intact C5-T1 dermatomes.",
        assessment: "Cervical radiculopathy resolved. Patient has met all functional goals and is appropriate for discharge.",
        plan: "Discharge from physical therapy. Continue home exercise program independently. Return PRN if symptoms recur.",
        exercises: ["Chin tucks - 2x10 daily", "Upper trap stretch - 30 sec x 2 each side", "Cervical rotation stretches", "Scapular squeezes - 2x15"],
        summary: "Discharge visit for cervical radiculopathy. All symptoms resolved, full ROM and strength restored. Patient independent with home program.",
      },
    },
  };

  // Get template or generate default
  const patientTemplates = noteTemplates[patient.name] || {};
  const caseTemplate = patientTemplates[caseTitle] || {};

  // Adjust content based on encounter type
  const baseNote = {
    encounterType,
    caseTitle,
    subjective: caseTemplate.subjective || `Patient presents for ${encounterType.toLowerCase()} regarding ${caseTitle}. Reports current symptoms and functional status.`,
    objective: caseTemplate.objective || "Physical examination findings documented. ROM, strength, and special tests performed.",
    assessment: caseTemplate.assessment || `${caseTitle} - Patient status assessed. Progress evaluated against treatment goals.`,
    plan: caseTemplate.plan || "Continue current treatment plan. Patient education provided. Follow-up scheduled.",
    exercises: caseTemplate.exercises || ["Therapeutic exercises as prescribed"],
    summary: caseTemplate.summary || `${encounterType} for ${caseTitle}. Treatment provided and plan established.`,
  };

  // Modify for initial evaluation
  if (encounterType === "Initial Evaluation") {
    baseNote.subjective = `New patient evaluation for ${caseTitle}. Patient reports onset, mechanism of injury, and current functional limitations.`;
    baseNote.assessment = `Initial evaluation completed for ${caseTitle}. Baseline measurements established. Treatment plan developed.`;
    baseNote.plan = `Initiate treatment plan for ${caseTitle}. Patient education on diagnosis and expected recovery. Schedule follow-up visits.`;
    baseNote.summary = `Initial evaluation for ${caseTitle}. Comprehensive assessment completed and treatment plan established.`;
  }

  // Modify for discharge
  if (encounterType === "Discharge") {
    baseNote.subjective = `Final visit for ${caseTitle}. Patient reports functional goals achieved and symptoms resolved or manageable.`;
    baseNote.assessment = `${caseTitle} - Discharge criteria met. Patient has achieved therapy goals.`;
    baseNote.plan = `Discharge from physical therapy. Independent home program provided. Return PRN if symptoms recur.`;
    baseNote.summary = `Discharge visit for ${caseTitle}. All goals met, patient discharged with home program.`;
  }

  return baseNote;
}

export default function PTDashboardLayout() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [currentPage, setCurrentPage] = useState<PTPage>("dashboard");
  const [emrSection, setEmrSection] = useState<EMRSection>("overview");
  const [selectedPatient, setSelectedPatient] = useState<typeof MOCK_PATIENTS[0] | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  // AI Capture state
  const [aiCaptureStep, setAiCaptureStep] = useState<AICaptureStep>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [parsedNote, setParsedNote] = useState<ParsedNote | null>(null);

  // Stored encounters - in production this would come from database
  const [storedEncounters, setStoredEncounters] = useState<StoredEncounter[]>([]);

  // Success notification state
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // For now, we'll use a simple flag to simulate admin access
  // In production, this would come from the practiceUsers table
  const isAdmin = true; // Temporary - all users have admin access for dev

  // Show loading while checking auth
  if (isSessionPending) {
    return <FullPageSpinner />;
  }

  // Check if user is logged in
  if (!session?.user?.id) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  const handlePatientSelect = (patient: typeof MOCK_PATIENTS[0]) => {
    setSelectedPatient(patient);
    setPatientSearch("");
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setEmrSection("overview");
  };

  const filteredPatients = MOCK_PATIENTS.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // AI Capture handlers
  const handleStartAICapture = () => {
    setAiCaptureStep("recording");
    setIsRecording(true);
    setRecordingTime(0);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setAiCaptureStep("processing");

    // Simulate AI processing (in production, this would send audio to AI service)
    setTimeout(() => {
      // Mock parsed result - in production this comes from AI
      const mockParsedNote: ParsedNote = {
        patientName: "Sarah Johnson",
        patientMatch: MOCK_PATIENTS[0],
        encounterType: "Follow-up",
        caseTitle: "Lumbar Disc Herniation",
        subjective: "Patient reports pain decreased from 6/10 to 4/10 since last visit. Sleeping better, able to sit for longer periods. Still has some discomfort with prolonged standing.",
        objective: "Flexion ROM improved to 45 degrees (was 30). Extension still limited to 10 degrees. Tenderness reduced over L4-L5. SLR negative bilaterally. Core activation improved.",
        assessment: "Patient showing good progress with conservative management. Pain reduction and improved ROM indicate positive response to current treatment approach.",
        plan: "Continue current exercise program. Progress to standing stabilization exercises. Re-evaluate in 1 week. Patient to continue home program daily.",
        exercises: [
          "Prone press-ups - 3 sets of 10",
          "Bird dogs - 3 sets of 10 each side",
          "McGill curl-ups - 3 sets of 10",
          "Supine piriformis stretch - 30 sec hold x 3"
        ],
        summary: "Follow-up visit for lumbar disc herniation. Patient improving with decreased pain and increased ROM. Continuing conservative treatment with progression of exercises.",
        confidence: 94,
      };

      setParsedNote(mockParsedNote);
      setAiCaptureStep("review");
    }, 2500);
  };

  const handleCancelCapture = () => {
    setAiCaptureStep("idle");
    setIsRecording(false);
    setRecordingTime(0);
    setParsedNote(null);
  };

  const handlePropagate = () => {
    if (!parsedNote || !parsedNote.patientMatch) return;

    // Create new encounter from parsed note
    const newEncounter: StoredEncounter = {
      id: `enc-${Date.now()}`,
      patientId: parsedNote.patientMatch.id,
      encounterType: parsedNote.encounterType,
      caseTitle: parsedNote.caseTitle,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      provider: session?.user?.name || "Dr. Smith",
      status: "Signed",
      subjective: parsedNote.subjective,
      objective: parsedNote.objective,
      assessment: parsedNote.assessment,
      plan: parsedNote.plan,
      exercises: parsedNote.exercises,
      summary: parsedNote.summary,
      createdAt: Date.now(),
    };

    // Add to stored encounters
    setStoredEncounters(prev => [newEncounter, ...prev]);

    // Show success notification
    setSuccessMessage(`${parsedNote.encounterType} note added to ${parsedNote.patientMatch.name}'s record`);
    setShowSuccessNotification(true);
    setTimeout(() => setShowSuccessNotification(false), 4000);

    // Close the modal
    handleCancelCapture();
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <ClinicHubDashboard
            userName={session?.user?.name || "Clinician"}
            onStartAICapture={handleStartAICapture}
            onNavigate={setCurrentPage}
          />
        );
      case "patients":
        return <Patients />;
      case "schedule":
        return <Schedule />;
      case "emr":
        return (
          <EMRView
            selectedPatient={selectedPatient}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            filteredPatients={filteredPatients}
            handlePatientSelect={handlePatientSelect}
            handleClearPatient={handleClearPatient}
            emrSection={emrSection}
            setEmrSection={setEmrSection}
            storedEncounters={storedEncounters}
          />
        );
      case "documents":
        return <PTDocumentsPlaceholder />;
      case "admin":
        return isAdmin ? <PTAdminPlaceholder /> : <NoAdminAccess />;
      case "settings":
        return <PTSettingsPlaceholder />;
      default:
        return (
          <ClinicHubDashboard
            userName={session?.user?.name || "Clinician"}
            onStartAICapture={handleStartAICapture}
            onNavigate={setCurrentPage}
          />
        );
    }
  };

  // EMR page uses different layout (no top nav padding, sidebar instead)
  if (currentPage === "emr") {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        {/* Minimal Top Header for EMR */}
        <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <NoviaLogo className="h-6 w-auto" />
            <div className="h-5 w-px bg-slate-200" />
            <button
              onClick={() => setCurrentPage("dashboard")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Clinic Hub
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {session?.user?.name || "PT User"}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* EMR Content with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {renderPage()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top Header - Clinic Hub Style */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 flex-shrink-0">
        {/* Left: Logo & Practice Name */}
        <div className="flex items-center gap-4">
          <NoviaLogo className="h-7 w-auto" />
          <div className="h-6 w-px bg-slate-200" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">
              Physical Therapy Portal
            </p>
            <p className="text-xs text-muted-foreground">Demo Practice</p>
          </div>
        </div>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                currentPage === item.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: Help & User */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {session?.user?.name || "PT User"}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Back to Home Link */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Page Content */}
      <div className="flex flex-1 overflow-hidden">
        {renderPage()}
      </div>

      {/* AI Capture Modal */}
      {aiCaptureStep !== "idle" && (
        <AICaptureModal
          step={aiCaptureStep}
          isRecording={isRecording}
          recordingTime={recordingTime}
          setRecordingTime={setRecordingTime}
          parsedNote={parsedNote}
          setParsedNote={setParsedNote}
          onStopRecording={handleStopRecording}
          onCancel={handleCancelCapture}
          onPropagate={handlePropagate}
        />
      )}

      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Note Propagated Successfully</p>
              <p className="text-sm text-emerald-100">{successMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessNotification(false)}
              className="ml-4 text-emerald-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AI CAPTURE MODAL - Voice recording and confirmation
// ============================================================================

interface AICaptureModalProps {
  step: AICaptureStep;
  isRecording: boolean;
  recordingTime: number;
  setRecordingTime: (time: number) => void;
  parsedNote: ParsedNote | null;
  setParsedNote: (note: ParsedNote | null) => void;
  onStopRecording: () => void;
  onCancel: () => void;
  onPropagate: () => void;
}

function AICaptureModal({
  step,
  isRecording,
  recordingTime,
  setRecordingTime,
  parsedNote,
  setParsedNote,
  onStopRecording,
  onCancel,
  onPropagate,
}: AICaptureModalProps) {
  // Dropdown states
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showEncounterDropdown, setShowEncounterDropdown] = useState(false);
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(recordingTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, recordingTime, setRecordingTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter patients based on search
  const filteredPatients = MOCK_PATIENTS.filter(p =>
    p.name.toLowerCase().includes(patientSearchQuery.toLowerCase())
  );

  // Get available cases for selected patient
  const availableCases = parsedNote?.patientMatch?.cases || [];

  // Handle patient change - regenerates the note
  const handlePatientChange = (patient: typeof MOCK_PATIENTS[0]) => {
    if (!parsedNote) return;

    setIsRegenerating(true);
    setShowPatientDropdown(false);
    setPatientSearchQuery("");

    // Simulate AI regeneration delay
    setTimeout(() => {
      const newCase = patient.activeCase;
      const regeneratedNote = generateNoteForPatient(patient, parsedNote.encounterType, newCase);

      setParsedNote({
        ...parsedNote,
        ...regeneratedNote,
        patientName: patient.name,
        patientMatch: patient,
        confidence: 98, // Higher confidence since user confirmed
      });
      setIsRegenerating(false);
    }, 800);
  };

  // Handle encounter type change - regenerates the note
  const handleEncounterTypeChange = (newEncounterType: string) => {
    if (!parsedNote || !parsedNote.patientMatch) return;

    setIsRegenerating(true);
    setShowEncounterDropdown(false);

    setTimeout(() => {
      const regeneratedNote = generateNoteForPatient(
        parsedNote.patientMatch!,
        newEncounterType,
        parsedNote.caseTitle
      );

      setParsedNote({
        ...parsedNote,
        ...regeneratedNote,
        confidence: 98,
      });
      setIsRegenerating(false);
    }, 600);
  };

  // Handle case change - regenerates the note
  const handleCaseChange = (newCaseTitle: string) => {
    if (!parsedNote || !parsedNote.patientMatch) return;

    setIsRegenerating(true);
    setShowCaseDropdown(false);

    setTimeout(() => {
      const regeneratedNote = generateNoteForPatient(
        parsedNote.patientMatch!,
        parsedNote.encounterType,
        newCaseTitle
      );

      setParsedNote({
        ...parsedNote,
        ...regeneratedNote,
        confidence: 98,
      });
      setIsRegenerating(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={cn(
        "bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300",
        step === "review" ? "w-full max-w-4xl max-h-[90vh]" : "w-full max-w-lg"
      )}>
        {/* Recording Step */}
        {step === "recording" && (
          <div className="p-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-slate-900">Hands-Free AI</h2>
              </div>

              <p className="text-muted-foreground mb-8">
                Speak naturally about your patient encounter. Include the patient name,
                what you observed, and your treatment plan.
              </p>

              {/* Recording Indicator */}
              <div className="relative mb-8">
                <div className={cn(
                  "w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all",
                  isRecording ? "bg-red-100 animate-pulse" : "bg-slate-100"
                )}>
                  <div className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center",
                    isRecording ? "bg-red-500" : "bg-slate-200"
                  )}>
                    <Mic className={cn(
                      "h-10 w-10",
                      isRecording ? "text-white" : "text-slate-400"
                    )} />
                  </div>
                </div>

                {isRecording && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-2 bg-red-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Recording {formatTime(recordingTime)}
                    </span>
                  </div>
                )}
              </div>

              {/* Example prompt */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Example:</p>
                <p className="text-sm text-slate-600 italic">
                  "Follow-up with Sarah Johnson for her lumbar disc. She says pain is down from 6 to 4.
                  ROM improved, did prone press-ups and bird dogs today. Plan to continue and progress next week."
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={onStopRecording}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === "processing" && (
          <div className="p-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-slate-900">Processing...</h2>
              </div>

              <div className="w-16 h-16 mx-auto mb-6">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              </div>

              <p className="text-muted-foreground">
                AI is analyzing your recording and matching patient information...
              </p>
            </div>
          </div>
        )}

        {/* Review Step - Confirmation Popup */}
        {step === "review" && parsedNote && (
          <div className="flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  {isRegenerating ? (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {isRegenerating ? "Regenerating Note..." : "Review AI-Generated Note"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {parsedNote.confidence}%
                  </p>
                </div>
              </div>
              <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Regenerating Overlay */}
            {isRegenerating && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-2xl">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Regenerating note with updated context...</p>
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Patient Match Card with Dropdown */}
              <div className="mb-6 relative">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Matched Patient</label>
                {parsedNote.patientMatch ? (
                  <div
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 cursor-pointer hover:border-emerald-300 transition-colors"
                    onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700">
                      {parsedNote.patientMatch.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{parsedNote.patientMatch.name}</p>
                        <Check className="h-4 w-4 text-emerald-600" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        DOB: {parsedNote.patientMatch.dob} • Active Case: {parsedNote.patientMatch.activeCase}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowPatientDropdown(!showPatientDropdown); }}>
                      <Edit3 className="h-4 w-4 mr-1" />
                      Change
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 cursor-pointer hover:border-amber-300 transition-colors"
                    onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                  >
                    <AlertCircle className="h-8 w-8 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">Could not match patient</p>
                      <p className="text-sm text-amber-700">Heard: "{parsedNote.patientName}"</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setShowPatientDropdown(!showPatientDropdown); }}>
                      Select Patient
                    </Button>
                  </div>
                )}

                {/* Patient Dropdown */}
                {showPatientDropdown && (
                  <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="p-3 border-b border-slate-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search patients..."
                          value={patientSearchQuery}
                          onChange={(e) => setPatientSearchQuery(e.target.value)}
                          className="pl-9"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-2">
                      {filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => handlePatientChange(patient)}
                          className={cn(
                            "w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors",
                            parsedNote.patientMatch?.id === patient.id && "bg-blue-50"
                          )}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-medium">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{patient.name}</p>
                            <p className="text-xs text-muted-foreground">DOB: {patient.dob} • {patient.activeCase}</p>
                          </div>
                          {parsedNote.patientMatch?.id === patient.id && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </button>
                      ))}
                      {filteredPatients.length === 0 && (
                        <p className="px-4 py-3 text-sm text-muted-foreground text-center">No patients found</p>
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => setShowPatientDropdown(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Encounter Type & Case Dropdowns */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Encounter Type Dropdown */}
                <div className="relative">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Encounter Type</label>
                  <button
                    onClick={() => setShowEncounterDropdown(!showEncounterDropdown)}
                    className="w-full flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors text-left"
                  >
                    <ClipboardList className="h-4 w-4 text-slate-400" />
                    <span className="font-medium flex-1">{parsedNote.encounterType}</span>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", showEncounterDropdown && "rotate-180")} />
                  </button>

                  {showEncounterDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                      {ENCOUNTER_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() => handleEncounterTypeChange(type)}
                          className={cn(
                            "w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between",
                            parsedNote.encounterType === type && "bg-blue-50 text-blue-700"
                          )}
                        >
                          <span>{type}</span>
                          {parsedNote.encounterType === type && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Case Dropdown */}
                <div className="relative">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Case</label>
                  <button
                    onClick={() => parsedNote.patientMatch && setShowCaseDropdown(!showCaseDropdown)}
                    disabled={!parsedNote.patientMatch}
                    className={cn(
                      "w-full flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white text-left transition-colors",
                      parsedNote.patientMatch ? "hover:border-slate-300" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <FolderOpen className="h-4 w-4 text-slate-400" />
                    <span className="font-medium flex-1 truncate">{parsedNote.caseTitle}</span>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", showCaseDropdown && "rotate-180")} />
                  </button>

                  {showCaseDropdown && availableCases.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                      {availableCases.map((caseTitle) => (
                        <button
                          key={caseTitle}
                          onClick={() => handleCaseChange(caseTitle)}
                          className={cn(
                            "w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between",
                            parsedNote.caseTitle === caseTitle && "bg-blue-50 text-blue-700"
                          )}
                        >
                          <span className="truncate">{caseTitle}</span>
                          {parsedNote.caseTitle === caseTitle && <Check className="h-4 w-4 flex-shrink-0" />}
                        </button>
                      ))}
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50">
                          + Create New Case
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Click outside to close dropdowns */}
              {(showPatientDropdown || showEncounterDropdown || showCaseDropdown) && (
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setShowPatientDropdown(false);
                    setShowEncounterDropdown(false);
                    setShowCaseDropdown(false);
                  }}
                />
              )}

              {/* SOAP Note */}
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-700 mb-3 block">SOAP Note</label>
                <div className="space-y-4">
                  <SOAPSection
                    label="Subjective"
                    value={parsedNote.subjective}
                    onChange={(val) => setParsedNote({ ...parsedNote, subjective: val })}
                    color="blue"
                  />
                  <SOAPSection
                    label="Objective"
                    value={parsedNote.objective}
                    onChange={(val) => setParsedNote({ ...parsedNote, objective: val })}
                    color="emerald"
                  />
                  <SOAPSection
                    label="Assessment"
                    value={parsedNote.assessment}
                    onChange={(val) => setParsedNote({ ...parsedNote, assessment: val })}
                    color="amber"
                  />
                  <SOAPSection
                    label="Plan"
                    value={parsedNote.plan}
                    onChange={(val) => setParsedNote({ ...parsedNote, plan: val })}
                    color="purple"
                  />
                </div>
              </div>

              {/* Exercises */}
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-700 mb-3 block flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Exercises Documented
                </label>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="space-y-2">
                    {parsedNote.exercises.map((exercise, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                          {i + 1}
                        </span>
                        <Input
                          value={exercise}
                          onChange={(e) => {
                            const newExercises = [...parsedNote.exercises];
                            newExercises[i] = e.target.value;
                            setParsedNote({ ...parsedNote, exercises: newExercises });
                          }}
                          className="flex-1 border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                        />
                        <button
                          onClick={() => {
                            const newExercises = parsedNote.exercises.filter((_, idx) => idx !== i);
                            setParsedNote({ ...parsedNote, exercises: newExercises });
                          }}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-muted-foreground"
                    onClick={() => setParsedNote({ ...parsedNote, exercises: [...parsedNote.exercises, ""] })}
                  >
                    + Add Exercise
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Visit Summary</label>
                <Textarea
                  value={parsedNote.summary}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setParsedNote({ ...parsedNote, summary: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="outline" disabled={!parsedNote.patientMatch}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit in EMR
                </Button>
                <Button
                  onClick={onPropagate}
                  disabled={!parsedNote.patientMatch || isRegenerating}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Propagate to EMR
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// SOAP Section editable component
function SOAPSection({
  label,
  value,
  onChange,
  color
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  color: "blue" | "emerald" | "amber" | "purple";
}) {
  const colorStyles = {
    blue: "border-l-blue-500 bg-blue-50/50",
    emerald: "border-l-emerald-500 bg-emerald-50/50",
    amber: "border-l-amber-500 bg-amber-50/50",
    purple: "border-l-purple-500 bg-purple-50/50",
  };

  return (
    <div className={cn("border-l-4 rounded-r-lg p-3", colorStyles[color])}>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
        {label}
      </label>
      <Textarea
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        className="min-h-[60px] border-0 bg-transparent p-0 resize-none focus-visible:ring-0 text-sm"
      />
    </div>
  );
}

// ============================================================================
// CLINIC HUB DASHBOARD - Based on first reference image
// ============================================================================

function ClinicHubDashboard({
  userName,
  onStartAICapture,
  onNavigate
}: {
  userName: string;
  onStartAICapture: () => void;
  onNavigate: (page: PTPage) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-slate-800 to-slate-700 text-white">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative px-8 py-12">
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white mb-4">
            <Activity className="h-3 w-3 mr-1" />
            Clinic Portal
          </span>
          <h1 className="text-3xl font-bold">
            Welcome, {userName.split(' ')[0]}.
          </h1>
          <p className="mt-2 text-slate-300 max-w-xl">
            Manage your patients, access documentation, and view your schedule all in one place.
          </p>
        </div>
      </div>

      {/* AI Quick Capture Banner */}
      <div className="px-8 -mt-6 relative z-10">
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Hands-Free AI Documentation
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Speak naturally and let AI create your clinical notes instantly
                  </p>
                </div>
              </div>
              <Button
                onClick={onStartAICapture}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Voice Capture
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Card - Recent Activity or Highlighted Patient */}
      <div className="px-8 mt-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                  <ClipboardList className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Today's Schedule
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      3 Appointments
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Next: Sarah Johnson at 10:30 AM • Follow-up Visit
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onNavigate("schedule")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
                <Button size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="px-8 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Patients</p>
                <p className="text-2xl font-bold text-slate-900">24</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Notes</p>
                <p className="text-2xl font-bold text-slate-900">3</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Messages</p>
                <p className="text-2xl font-bold text-slate-900">2 New</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Next Deadline</p>
                <p className="text-lg font-bold text-slate-900">Jan 15</p>
                <p className="text-xs text-muted-foreground">Insurance Auth</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="px-8 py-6 grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => onNavigate("patients")}
            >
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm">View Patients</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => onNavigate("emr")}
            >
              <FileText className="h-5 w-5 text-emerald-600" />
              <span className="text-sm">New Note</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => onNavigate("schedule")}
            >
              <Calendar className="h-5 w-5 text-purple-600" />
              <span className="text-sm">Schedule</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center justify-center gap-2"
              onClick={() => onNavigate("emr")}
            >
              <ClipboardList className="h-5 w-5 text-amber-600" />
              <span className="text-sm">Open EMR</span>
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { action: "Completed evaluation", patient: "Sarah Johnson", time: "2 hours ago" },
              { action: "Updated treatment plan", patient: "Michael Chen", time: "4 hours ago" },
              { action: "Signed progress note", patient: "Emily Rodriguez", time: "Yesterday" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.patient}</p>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground">
            View All Activity
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EMR VIEW - Based on second reference image (left sidebar layout)
// ============================================================================

interface EMRViewProps {
  selectedPatient: typeof MOCK_PATIENTS[0] | null;
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  filteredPatients: typeof MOCK_PATIENTS;
  handlePatientSelect: (patient: typeof MOCK_PATIENTS[0]) => void;
  handleClearPatient: () => void;
  emrSection: EMRSection;
  setEmrSection: (section: EMRSection) => void;
  storedEncounters: StoredEncounter[];
}

function EMRView({
  selectedPatient,
  patientSearch,
  setPatientSearch,
  filteredPatients,
  handlePatientSelect,
  handleClearPatient,
  emrSection,
  setEmrSection,
  storedEncounters,
}: EMRViewProps) {
  return (
    <>
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
        {/* Patient Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Search Results Dropdown */}
          {patientSearch && (
            <div className="absolute z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
              {filteredPatients.length > 0 ? (
                <div className="py-1">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-medium">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">DOB: {patient.dob}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No patients found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Patient Info */}
        {selectedPatient ? (
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Selected Patient
              </span>
              <button
                onClick={handleClearPatient}
                className="text-muted-foreground hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                {selectedPatient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedPatient.name}</p>
                <p className="text-xs text-muted-foreground">DOB: {selectedPatient.dob}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-slate-200 bg-amber-50">
            <p className="text-sm text-amber-800">
              Search for a patient above to view their records.
            </p>
          </div>
        )}

        {/* EMR Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-2 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Patient Records
            </span>
          </div>
          {EMR_SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => selectedPatient && setEmrSection(item.id)}
              disabled={!selectedPatient}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                emrSection === item.id && selectedPatient
                  ? "bg-blue-50 text-blue-700"
                  : selectedPatient
                  ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  : "text-slate-400 cursor-not-allowed"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {emrSection === item.id && selectedPatient && (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </button>
          ))}

          {/* Additional Sections */}
          <div className="mt-6 mb-2 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tools
            </span>
          </div>
          <button
            disabled={!selectedPatient}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              selectedPatient
                ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                : "text-slate-400 cursor-not-allowed"
            )}
          >
            <FileText className="h-4 w-4" />
            Generate Report
          </button>
          <button
            disabled={!selectedPatient}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              selectedPatient
                ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                : "text-slate-400 cursor-not-allowed"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Message Patient
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {selectedPatient ? (
          <EMRContent patient={selectedPatient} section={emrSection} storedEncounters={storedEncounters} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Select a Patient
              </h2>
              <p className="text-muted-foreground">
                Use the search bar to find and select a patient to view their electronic medical records.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// EMR Content based on selected section
function EMRContent({ patient, section, storedEncounters }: { patient: typeof MOCK_PATIENTS[0]; section: EMRSection; storedEncounters: StoredEncounter[] }) {
  const [selectedEncounter, setSelectedEncounter] = useState<StoredEncounter | null>(null);

  // Get encounters for this patient
  const patientEncounters = storedEncounters.filter(enc => enc.patientId === patient.id);

  // Default encounters (mock data)
  const defaultEncounters = [
    { id: "default-1", type: "Follow-up", date: "Jan 10, 2024", provider: "Dr. Smith", status: "Signed" as const },
    { id: "default-2", type: "Follow-up", date: "Jan 3, 2024", provider: "Dr. Smith", status: "Signed" as const },
    { id: "default-3", type: "Initial Evaluation", date: "Dec 15, 2023", provider: "Dr. Smith", status: "Signed" as const },
  ];

  return (
    <div className="p-6">
      {/* Patient Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>DOB: {patient.dob}</span>
                <span>•</span>
                <span>ID: PT-{patient.id.padStart(5, '0')}</span>
                <span>•</span>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  patient.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                )}>
                  {patient.status === "active" ? "Active" : "Discharged"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ChevronDown className="h-4 w-4 mr-2" />
              Actions
            </Button>
            <Button size="sm">
              <FileText className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>
      </div>

      {/* Section Content */}
      {section === "overview" && (
        <div className="space-y-6">
          {/* Top Row: Patient Info + Active Cases */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Patient Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="text-sm font-medium">(555) 123-4567</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{patient.name.toLowerCase().replace(' ', '.')}@email.com</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-muted-foreground">Insurance</span>
                  <span className="text-sm font-medium">Blue Cross Blue Shield</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted-foreground">Last Visit</span>
                  <span className="text-sm font-medium">{patient.lastVisit}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Active Cases</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900">{patient.activeCase || "Low Back Pain"}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Started: Dec 15, 2023 • {patientEncounters.length + 6} visits</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground">
                View All Cases
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Body Diagram Section */}
          {patient.injuries && patient.injuries.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Body Assessment</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Interactive injury map with exercise metrics</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {patient.injuries.length} injury {patient.injuries.length === 1 ? "site" : "sites"}
                </span>
              </div>
              <HumanBodyDiagram
                injuries={patient.injuries}
                imbalanceData={patient.imbalanceData}
              />
            </div>
          )}

          {/* Analytics & Trends Section */}
          {patient.analytics && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Analytics & Trends</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Treatment progress and outcome tracking</p>
                </div>
              </div>
              <PatientAnalytics
                painTrend={patient.analytics.painTrend}
                romTrend={patient.analytics.romTrend}
                strengthTrend={patient.analytics.strengthTrend}
                functionalScore={patient.analytics.functionalScore}
                visitCount={patient.analytics.visitCount}
                progressPercentage={patient.analytics.progressPercentage}
              />
            </div>
          )}

          {/* Recent Encounters on Overview */}
          {patientEncounters.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Recent Encounters</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {patientEncounters.length} new from AI capture
                </span>
              </div>
              <div className="space-y-2">
                {patientEncounters.slice(0, 3).map((enc) => (
                  <div
                    key={enc.id}
                    onClick={() => setSelectedEncounter(enc)}
                    className="p-3 rounded-lg border border-blue-100 bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-slate-900">{enc.encounterType}</span>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{enc.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{enc.date} • {enc.provider} • {enc.caseTitle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {section === "cases" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Episodes of Care</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-900">{patient.activeCase || "Low Back Pain"} - Lumbar Disc Herniation</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">ICD-10: M51.16</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Started: Dec 15, 2023</span>
                <span>•</span>
                <span>{patientEncounters.length + 6} visits</span>
                <span>•</span>
                <span>Auth: 12 visits remaining</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {section === "encounters" && !selectedEncounter && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Encounters</h3>
            <Button size="sm">
              <FileText className="h-4 w-4 mr-2" />
              New Encounter
            </Button>
          </div>
          <div className="space-y-3">
            {/* AI-generated encounters first */}
            {patientEncounters.map((enc) => (
              <div
                key={enc.id}
                onClick={() => setSelectedEncounter(enc)}
                className="p-4 rounded-lg border border-blue-100 bg-blue-50/30 hover:border-blue-200 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-slate-900">{enc.encounterType}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">AI Generated</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{enc.date} • {enc.provider} • {enc.caseTitle}</p>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-1">{enc.summary}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{enc.status}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            ))}

            {/* Default encounters */}
            {defaultEncounters.map((enc) => (
              <div key={enc.id} className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{enc.type}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{enc.date} • {enc.provider}</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{enc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encounter Detail View */}
      {section === "encounters" && selectedEncounter && (
        <div className="space-y-6">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedEncounter(null)}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Encounters
          </Button>

          {/* Encounter Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedEncounter.encounterType}</h2>
                  <p className="text-sm text-muted-foreground">{selectedEncounter.date} • {selectedEncounter.provider}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">AI Generated</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{selectedEncounter.status}</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Case:</strong> {selectedEncounter.caseTitle}
            </div>
          </div>

          {/* SOAP Note */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">SOAP Note</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-l-blue-500 bg-blue-50/50 rounded-r-lg p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Subjective</label>
                <p className="text-sm text-slate-700">{selectedEncounter.subjective}</p>
              </div>
              <div className="border-l-4 border-l-emerald-500 bg-emerald-50/50 rounded-r-lg p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Objective</label>
                <p className="text-sm text-slate-700">{selectedEncounter.objective}</p>
              </div>
              <div className="border-l-4 border-l-amber-500 bg-amber-50/50 rounded-r-lg p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Assessment</label>
                <p className="text-sm text-slate-700">{selectedEncounter.assessment}</p>
              </div>
              <div className="border-l-4 border-l-purple-500 bg-purple-50/50 rounded-r-lg p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Plan</label>
                <p className="text-sm text-slate-700">{selectedEncounter.plan}</p>
              </div>
            </div>
          </div>

          {/* Exercises */}
          {selectedEncounter.exercises.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Exercises Prescribed
              </h3>
              <div className="space-y-2">
                {selectedEncounter.exercises.map((exercise, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700">{exercise}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Visit Summary</h3>
            <p className="text-sm text-slate-700">{selectedEncounter.summary}</p>
          </div>
        </div>
      )}

      {section === "documents" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Documents</h3>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
            <Button variant="outline" className="mt-4">Upload Document</Button>
          </div>
        </div>
      )}

      {section === "billing" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Billing & Insurance</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50">
              <h4 className="font-medium text-slate-900 mb-2">Primary Insurance</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Provider</span>
                <span>Blue Cross Blue Shield</span>
                <span className="text-muted-foreground">Member ID</span>
                <span>BCBS123456789</span>
                <span className="text-muted-foreground">Group #</span>
                <span>GRP001</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PLACEHOLDER COMPONENTS
// ============================================================================

function PTDocumentsPlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        Documents
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">Document management coming soon</p>
      </div>
    </div>
  );
}

function PTAdminPlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        Practice Administration
      </h1>
      <p className="text-muted-foreground mb-6">
        Manage your practice settings, clinicians, and billing.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 cursor-pointer transition-colors">
          <Building2 className="h-8 w-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-slate-900">Practice Info</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Update practice details, address, and contact info
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 cursor-pointer transition-colors">
          <Users className="h-8 w-8 text-emerald-600 mb-3" />
          <h3 className="font-semibold text-slate-900">Clinicians</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage clinicians and staff access
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 cursor-pointer transition-colors">
          <FileText className="h-8 w-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-slate-900">Billing</h3>
          <p className="text-sm text-muted-foreground mt-1">
            View invoices and manage subscription
          </p>
        </div>
      </div>
    </div>
  );
}

function PTSettingsPlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        Settings
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <Settings className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">User settings coming soon</p>
      </div>
    </div>
  );
}

function NoAdminAccess() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center max-w-md">
          <Lock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Admin Access Required
          </h2>
          <p className="text-muted-foreground">
            You do not have admin access. Please contact your practice administrator
            if you need access to this section.
          </p>
        </div>
      </div>
    </div>
  );
}
