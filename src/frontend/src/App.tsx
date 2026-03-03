import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import WelcomeScreen from "./components/WelcomeScreen";
import LoginPage from "./pages/LoginPage";
import PredictionPage from "./pages/PredictionPage";
import { isSessionValid } from "./utils/session";

type AppView = "login" | "welcome" | "prediction";

export default function App() {
  const [view, setView] = useState<AppView>("login");
  const [initialized, setInitialized] = useState(false);

  // Check session on mount
  useEffect(() => {
    if (isSessionValid()) {
      setView("prediction");
    }
    setInitialized(true);
  }, []);

  if (!initialized) {
    // Brief loading flash
    return (
      <div
        className="cyber-bg min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.05 0.01 240)" }}
      >
        <div className="text-center">
          <p
            className="text-lg tracking-widest neon-green"
            style={{
              fontFamily: '"Geist Mono", monospace',
              animation: "dotPulse 1.4s ease-in-out infinite",
            }}
          >
            VIP PREDICTION ALOK
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.11 0.015 240)",
            border: "1px solid oklch(0.82 0.22 142 / 0.3)",
            color: "oklch(0.92 0.04 160)",
            fontFamily: '"Geist Mono", monospace',
            fontSize: "12px",
            letterSpacing: "0.05em",
          },
        }}
      />
      {view === "login" ? (
        <LoginPage onLoginSuccess={() => setView("welcome")} />
      ) : view === "welcome" ? (
        <>
          {/* Show prediction page underneath while welcome plays */}
          <PredictionPage onLogout={() => setView("login")} />
          <WelcomeScreen onComplete={() => setView("prediction")} />
        </>
      ) : (
        <PredictionPage onLogout={() => setView("login")} />
      )}
    </>
  );
}
