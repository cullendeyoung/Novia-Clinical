function Spinner() {
  return (
    <svg
      className="h-12 w-12 animate-spin text-primary"
      viewBox="0 0 50 50"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="80 40"
      />
    </svg>
  );
}

export default function FullPageSpinner() {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex h-full items-center justify-center">
        <div className="-translate-y-16">
          <Spinner />
        </div>
      </div>
    </div>
  );
}
