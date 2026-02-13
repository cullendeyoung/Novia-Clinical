import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SpecodeIframeTracker } from "@/components/layout/SpecodeIframeTracker";
import { HIPAABanner } from "@/components/layout/HIPAABanner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthHeader from "@/components/layout/AuthHeader";

export default function App() {
  const location = useLocation();
  const isAuthRoute = ["/login", "/register", "/forgot-password"].includes(
    location.pathname,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <HIPAABanner />
      <SpecodeIframeTracker />
      {isAuthRoute ? <AuthHeader /> : <Header />}
      {isAuthRoute ? (
        <main className="flex flex-1 items-center justify-center bg-background p-4">
          <Outlet />
        </main>
      ) : (
        <main className="flex flex-1 flex-col bg-background">
          <Outlet />
        </main>
      )}
      {!isAuthRoute && <Footer />}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid #e2e8f0",
            borderRadius: "999px",
            padding: "10px 16px",
            fontSize: "13px",
          },
          success: {
            iconTheme: {
              primary: "#14b8a6",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#ffffff",
            },
          },
        }}
      />
    </div>
  );
}
