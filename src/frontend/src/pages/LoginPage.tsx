import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { type FormEvent, useEffect, useState } from "react";
import { useAuthenticate } from "../hooks/useQueries";
import { createSession } from "../utils/session";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const authenticate = useAuthenticate();

  // Play welcome chime on mount via Web Audio API
  useEffect(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") return; // autoplay blocked silently

      const now = ctx.currentTime;

      // Rising chime: 440Hz → 880Hz over 0.35s, then short tail
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.22, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.35);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.75);

      osc.onended = () => ctx.close();
    } catch {
      // Autoplay blocked or AudioContext not supported — ignore silently
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Password required");
      return;
    }

    try {
      await authenticate.mutateAsync(password);
      createSession();
      onLoginSuccess();
    } catch {
      setError("Wrong Password");
      setPassword("");
    }
  };

  return (
    <div className="cyber-bg min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Decorative corner lines */}
      <div className="fixed top-0 left-0 w-32 h-32 pointer-events-none">
        <div
          className="absolute top-4 left-4 w-16 h-16"
          style={{
            borderTop: "2px solid oklch(0.82 0.22 142 / 0.5)",
            borderLeft: "2px solid oklch(0.82 0.22 142 / 0.5)",
          }}
        />
      </div>
      <div className="fixed top-0 right-0 w-32 h-32 pointer-events-none">
        <div
          className="absolute top-4 right-4 w-16 h-16"
          style={{
            borderTop: "2px solid oklch(0.72 0.2 200 / 0.5)",
            borderRight: "2px solid oklch(0.72 0.2 200 / 0.5)",
          }}
        />
      </div>
      <div className="fixed bottom-0 left-0 w-32 h-32 pointer-events-none">
        <div
          className="absolute bottom-4 left-4 w-16 h-16"
          style={{
            borderBottom: "2px solid oklch(0.72 0.2 200 / 0.5)",
            borderLeft: "2px solid oklch(0.72 0.2 200 / 0.5)",
          }}
        />
      </div>
      <div className="fixed bottom-0 right-0 w-32 h-32 pointer-events-none">
        <div
          className="absolute bottom-4 right-4 w-16 h-16"
          style={{
            borderBottom: "2px solid oklch(0.82 0.22 142 / 0.5)",
            borderRight: "2px solid oklch(0.82 0.22 142 / 0.5)",
          }}
        />
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-10">
          {/* Icon badge */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.2,
              duration: 0.5,
              type: "spring",
              stiffness: 200,
            }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 relative"
            style={{
              background: "oklch(0.09 0.015 230)",
              border: "2px solid oklch(0.82 0.22 142 / 0.5)",
              boxShadow:
                "0 0 20px oklch(0.82 0.22 142 / 0.3), 0 0 40px oklch(0.82 0.22 142 / 0.15), inset 0 0 20px oklch(0.82 0.22 142 / 0.05)",
            }}
          >
            <Lock className="w-9 h-9 neon-green" />
            {/* Rotating ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "1px solid oklch(0.82 0.22 142 / 0.2)",
                animation: "spin 8s linear infinite",
                borderTopColor: "oklch(0.82 0.22 142 / 0.7)",
              }}
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold tracking-wider neon-green flicker mb-3"
            style={{
              fontFamily: '"Geist Mono", monospace',
              letterSpacing: "0.1em",
            }}
          >
            VIP PREDICTION
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-xl sm:text-2xl font-bold neon-pink tracking-widest mb-4"
            style={{
              fontFamily: '"Geist Mono", monospace',
              letterSpacing: "0.15em",
            }}
          >
            ⚡ ALOK ⚡
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-sm tracking-wide"
            style={{ color: "oklch(0.5 0.06 200)" }}
          >
            Jyada lalach nahi. Sahi prediction, sahi time.
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-4 h-px mx-auto w-48"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.82 0.22 142 / 0.6), transparent)",
            }}
          />
        </div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="circuit-border rounded-lg p-6 sm:p-8"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.1 0.015 240), oklch(0.12 0.02 220))",
            boxShadow:
              "0 0 30px oklch(0.82 0.22 142 / 0.08), 0 20px 60px oklch(0.05 0.01 240 / 0.8)",
          }}
        >
          {/* Status bar */}
          <div
            className="flex items-center gap-2 mb-6 pb-4"
            style={{ borderBottom: "1px solid oklch(0.82 0.22 142 / 0.15)" }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: "oklch(0.82 0.22 142)",
                boxShadow:
                  "0 0 6px oklch(0.82 0.22 142 / 0.8), 0 0 12px oklch(0.82 0.22 142 / 0.4)",
                animation: "dotPulse 1.4s ease-in-out infinite",
              }}
            />
            <span
              className="text-xs tracking-widest"
              style={{
                color: "oklch(0.5 0.06 200)",
                fontFamily: '"Geist Mono", monospace',
              }}
            >
              SECURE CONNECTION ACTIVE
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block text-xs tracking-widest mb-2"
                style={{
                  color: "oklch(0.6 0.12 142)",
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                ENTER ACCESS CODE
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "oklch(0.82 0.22 142 / 0.5)" }}
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 rounded text-sm tracking-widest outline-none transition-all"
                  style={{
                    background: "oklch(0.07 0.01 240)",
                    border: error
                      ? "1px solid oklch(0.65 0.28 22 / 0.8)"
                      : "1px solid oklch(0.82 0.22 142 / 0.3)",
                    color: "oklch(0.92 0.04 160)",
                    fontFamily: '"Geist Mono", monospace',
                    boxShadow: error
                      ? "0 0 8px oklch(0.65 0.28 22 / 0.2)"
                      : "0 0 8px oklch(0.82 0.22 142 / 0.1)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border =
                      "1px solid oklch(0.82 0.22 142 / 0.8)";
                    e.currentTarget.style.boxShadow =
                      "0 0 15px oklch(0.82 0.22 142 / 0.2)";
                  }}
                  onBlur={(e) => {
                    if (!error) {
                      e.currentTarget.style.border =
                        "1px solid oklch(0.82 0.22 142 / 0.3)";
                      e.currentTarget.style.boxShadow =
                        "0 0 8px oklch(0.82 0.22 142 / 0.1)";
                    }
                  }}
                />
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mt-2"
                >
                  <AlertCircle
                    className="w-3.5 h-3.5"
                    style={{ color: "oklch(0.65 0.28 22)" }}
                  />
                  <span
                    className="text-xs tracking-wide"
                    style={{
                      color: "oklch(0.65 0.28 22)",
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    {error}
                  </span>
                </motion.div>
              )}
            </div>

            <button
              type="submit"
              disabled={authenticate.isPending}
              className="w-full py-3.5 rounded font-bold text-sm tracking-widest transition-all relative overflow-hidden group"
              style={{
                background: authenticate.isPending
                  ? "oklch(0.45 0.12 142)"
                  : "oklch(0.82 0.22 142)",
                color: "oklch(0.05 0.01 240)",
                fontFamily: '"Geist Mono", monospace',
                letterSpacing: "0.2em",
                boxShadow: authenticate.isPending
                  ? "none"
                  : "0 0 15px oklch(0.82 0.22 142 / 0.5), 0 0 30px oklch(0.82 0.22 142 / 0.2)",
                cursor: authenticate.isPending ? "not-allowed" : "pointer",
              }}
            >
              {/* Shimmer overlay */}
              {!authenticate.isPending && (
                <span className="absolute inset-0 card-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {authenticate.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    VERIFYING...
                  </>
                ) : (
                  "🔓 LOGIN"
                )}
              </span>
            </button>
          </form>
        </motion.div>

        {/* Register CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="mt-4 text-center"
        >
          <a
            href="https://www.hyderabad91.com/#/register?invitationCode=4841620269921"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded font-bold text-sm tracking-widest transition-all hover:scale-105"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.22 140), oklch(0.65 0.25 145))",
              color: "oklch(0.05 0.01 240)",
              fontFamily: '"Geist Mono", monospace',
              letterSpacing: "0.15em",
              boxShadow:
                "0 0 20px oklch(0.72 0.22 140 / 0.5), 0 0 40px oklch(0.72 0.22 140 / 0.25)",
              textDecoration: "none",
            }}
          >
            <UserPlus className="w-4 h-4" />🎯 REGISTER NOW
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
          <p
            className="text-xs mt-1.5 tracking-wider"
            style={{
              color: "oklch(0.45 0.06 200)",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            New account? Register & start playing
          </p>
        </motion.div>

        {/* Telegram CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-4 circuit-border rounded-lg p-4 text-center"
          style={{
            background: "oklch(0.09 0.01 230)",
            borderColor: "oklch(0.72 0.2 200 / 0.3)",
          }}
        >
          <p
            className="text-xs tracking-widest mb-3"
            style={{
              color: "oklch(0.6 0.08 200)",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            PASSWORD CHAHIYE TO MESSAGE KARO 👇
          </p>
          <a
            href="https://t.me/propredictiongowin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold tracking-widest transition-all hover:scale-105"
            style={{
              background: "oklch(0.46 0.18 230)",
              color: "oklch(0.97 0 0)",
              fontFamily: '"Geist Mono", monospace',
              boxShadow:
                "0 0 10px oklch(0.46 0.18 230 / 0.4), 0 0 20px oklch(0.46 0.18 230 / 0.2)",
              textDecoration: "none",
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            TELEGRAM MESSAGE KARO
          </a>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-xs mt-6"
          style={{
            color: "oklch(0.3 0.03 200)",
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.5 0.1 142)", textDecoration: "none" }}
          >
            caffeine.ai
          </a>
        </motion.p>
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
