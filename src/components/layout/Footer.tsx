import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-12">
        <div className="flex flex-col gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="space-y-2">
            <Link to="/" className="inline-flex">
              <img src="/logo.svg" alt="Specode" className="h-7 w-auto" />
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-primary-foreground/20 pt-6">
          <div className="mx-auto w-full max-w-5xl">
            <p className="text-left text-sm font-medium text-primary-foreground/90">
              © Specode 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
