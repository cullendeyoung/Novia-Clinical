export default function Dashboard() {
  return (
    <div className="flex flex-1 items-start justify-center bg-background px-4 py-16">
      <div className="w-full max-w-4xl rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="mt-3 text-muted-foreground">
          This is your dashboard, an auth-protected page. You can now build your
          features here.
        </p>
      </div>
    </div>
  );
}
