import {
  Activity,
  AlertTriangle,
  Cpu,
  ExternalLink,
  Eye,
  History,
  LogOut,
  MessageCircle,
  Plus,
  Shield,
  Trophy,
  UserPlus,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useCurrentPeriodInfo,
  useHeartbeat,
  useVisitorStats,
} from "../hooks/useQueries";
import { clearSession } from "../utils/session";

interface PredictionPageProps {
  onLogout: () => void;
}

interface ResultEntry {
  period: string;
  num1: number;
  num2: number;
  sum: number;
  resultDigit: number;
  result: "BIG" | "SMALL";
  timestamp: number;
}

const HISTORY_KEY = "vip_result_history";
const MAX_HISTORY = 20;

function loadHistory(): ResultEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ResultEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: ResultEntry[]): void {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(entries.slice(0, MAX_HISTORY)),
    );
  } catch {
    // ignore
  }
}

function formatPeriodNumber(n: bigint): string {
  return n.toString().padStart(12, "0");
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function generatePeriodFromTime(): bigint {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const minuteOfDay = Math.floor(now.getHours() * 60 + now.getMinutes());
  return BigInt(`${dateStr}${String(minuteOfDay).padStart(4, "0")}`);
}

interface AnalysisData {
  streak: number;
  streakType: "BIG" | "SMALL";
  bigProb: number;
  smallProb: number;
  streakAlert: boolean;
  aiPrediction: "BIG" | "SMALL";
  aiConfidence: number;
  entryAllowed: boolean;
}

function computeAnalysis(history: ResultEntry[]): AnalysisData | null {
  if (history.length < 3) return null;

  const results = history.map((h) => h.result);

  // Streak from most recent
  let streak = 1;
  const streakType = results[0];
  for (let i = 1; i < results.length; i++) {
    if (results[i] === streakType) streak++;
    else break;
  }

  const bigCount = results.filter((r) => r === "BIG").length;
  const bigProb = Math.round((bigCount / results.length) * 100);
  const smallProb = 100 - bigProb;

  const streakAlert = streak >= 3;
  let aiPrediction: "BIG" | "SMALL";
  let aiConfidence: number;

  if (streak >= 4) {
    // Strong reversal signal
    aiPrediction = streakType === "BIG" ? "SMALL" : "BIG";
    aiConfidence = Math.min(55 + streak * 6, 88);
  } else if (streakAlert) {
    aiPrediction = streakType === "BIG" ? "SMALL" : "BIG";
    aiConfidence = Math.min(55 + streak * 5, 82);
  } else {
    aiPrediction = bigProb >= smallProb ? "BIG" : "SMALL";
    aiConfidence = Math.max(bigProb, smallProb);
  }

  const entryAllowed = aiConfidence >= 60 && streak < 5;

  return {
    streak,
    streakType,
    bigProb,
    smallProb,
    streakAlert,
    aiPrediction,
    aiConfidence,
    entryAllowed,
  };
}

export default function PredictionPage({ onLogout }: PredictionPageProps) {
  const [localSeconds, setLocalSeconds] = useState<number>(60);
  const [displayPeriod, setDisplayPeriod] = useState<bigint>(
    generatePeriodFromTime(),
  );

  // The two single-digit inputs
  const [num1, setNum1] = useState<string>("");
  const [num2, setNum2] = useState<string>("");
  const num2Ref = useRef<HTMLInputElement>(null);

  const [resultHistory, setResultHistory] =
    useState<ResultEntry[]>(loadHistory);

  const periodInfoQuery = useCurrentPeriodInfo();
  const visitorStatsQuery = useVisitorStats();
  const { mutate: sendHeartbeat } = useHeartbeat();

  // Sync local countdown from server data
  useEffect(() => {
    if (periodInfoQuery.data) {
      const serverSecs = Number(periodInfoQuery.data.secondsRemaining);
      setLocalSeconds(serverSecs);
      const newPeriod = periodInfoQuery.data.periodNumber;
      if (newPeriod !== BigInt(0)) {
        setDisplayPeriod(newPeriod);
      }
    }
  }, [periodInfoQuery.data]);

  // Local countdown fallback (runs every second)
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalSeconds((prev) => {
        if (prev <= 0) {
          setDisplayPeriod(generatePeriodFromTime());
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Heartbeat every 3 minutes
  useEffect(() => {
    sendHeartbeat();
    const interval = setInterval(
      () => {
        sendHeartbeat();
      },
      3 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [sendHeartbeat]);

  const seconds = periodInfoQuery.data
    ? Number(periodInfoQuery.data.secondsRemaining)
    : localSeconds;

  const isUrgent = seconds <= 10;

  // Derived calculation
  const n1 = num1 !== "" ? Number.parseInt(num1, 10) : null;
  const n2 = num2 !== "" ? Number.parseInt(num2, 10) : null;
  const bothEntered = n1 !== null && n2 !== null;
  const sumVal = bothEntered ? n1 + n2 : null;
  const resultDigit = sumVal !== null ? sumVal % 10 : null;
  const resultLabel: "BIG" | "SMALL" | null =
    resultDigit !== null ? (resultDigit >= 5 ? "BIG" : "SMALL") : null;
  const isBig = resultLabel === "BIG";

  const analysis = computeAnalysis(resultHistory);

  const handleLogout = useCallback(() => {
    clearSession();
    onLogout();
  }, [onLogout]);

  // Auto-advance to second input
  const handleNum1Change = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 1);
    setNum1(clean);
    if (clean.length === 1 && num2Ref.current) {
      num2Ref.current.focus();
    }
  };

  const handleNum2Change = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 1);
    setNum2(clean);
  };

  // Add result to history
  const handleAddResult = useCallback(() => {
    if (!bothEntered || resultDigit === null || resultLabel === null) return;
    const entry: ResultEntry = {
      period: formatPeriodNumber(displayPeriod),
      num1: n1!,
      num2: n2!,
      sum: sumVal!,
      resultDigit,
      result: resultLabel,
      timestamp: Date.now(),
    };
    setResultHistory((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
    // Clear inputs after adding
    setNum1("");
    setNum2("");
  }, [bothEntered, resultDigit, resultLabel, displayPeriod, n1, n2, sumVal]);

  const handleClearHistory = () => {
    setResultHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="cyber-bg min-h-screen flex flex-col relative">
      {/* Ambient blobs */}
      <div
        className="fixed top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.72 0.2 200 / 0.04) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="fixed bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.68 0.28 330 / 0.04) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* ─── Header ─── */}
      <header
        className="relative z-10 px-4 py-2 sm:px-6"
        style={{
          background: "oklch(0.08 0.01 240 / 0.95)",
          borderBottom: "1px solid oklch(0.82 0.22 142 / 0.2)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-5 h-5 neon-green shrink-0" />
            <span
              className="text-sm sm:text-base font-bold tracking-widest neon-green truncate"
              style={{ fontFamily: '"Geist Mono", monospace' }}
            >
              VIP PREDICTION <span className="neon-pink">ALOK</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs"
              style={{ background: "oklch(0.12 0.02 200)" }}
            >
              <Wifi
                className="w-3 h-3"
                style={{ color: "oklch(0.82 0.22 142)" }}
              />
              <span
                className="tracking-wider"
                style={{
                  color: "oklch(0.82 0.22 142)",
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                LIVE
              </span>
            </div>

            <a
              href="https://www.hyderabad91.com/#/register?invitationCode=4841620269921"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="header.register.link"
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-all hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.22 140), oklch(0.65 0.25 145))",
                color: "oklch(0.05 0.01 240)",
                fontFamily: '"Geist Mono", monospace',
                boxShadow: "0 0 10px oklch(0.72 0.22 140 / 0.4)",
                textDecoration: "none",
              }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">REGISTER</span>
            </a>

            <button
              type="button"
              onClick={handleLogout}
              data-ocid="header.logout.button"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs transition-all hover:scale-105"
              style={{
                background: "oklch(0.15 0.03 22)",
                border: "1px solid oklch(0.65 0.28 22 / 0.4)",
                color: "oklch(0.65 0.28 22)",
                fontFamily: '"Geist Mono", monospace',
                letterSpacing: "0.08em",
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">LOGOUT</span>
            </button>
          </div>
        </div>

        {/* Marquee */}
        <div
          className="mt-1.5 overflow-hidden rounded"
          style={{
            background: "oklch(0.07 0.012 240)",
            border: "1px solid oklch(0.82 0.22 142 / 0.1)",
          }}
        >
          <div
            className="text-marquee py-1 whitespace-nowrap text-xs font-bold tracking-widest"
            style={{
              color: "oklch(0.82 0.22 142)",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            🎯 WINGO 1-MIN RESULT TRACKING Analysis &nbsp;|&nbsp; DIRECT ANSWER:
            100% SURESHOT &nbsp;|&nbsp; Big - Small prediction &nbsp;|&nbsp; 🎯
            WINGO 1-MIN RESULT TRACKING Analysis &nbsp;|&nbsp; DIRECT ANSWER:
            100% SURESHOT &nbsp;|&nbsp; Big - Small prediction &nbsp;|&nbsp;
          </div>
        </div>

        {/* Visitor stats */}
        <div
          className="mt-1.5 flex items-center justify-start gap-0 rounded overflow-hidden"
          style={{
            background: "oklch(0.065 0.01 240)",
            border: "1px solid oklch(0.82 0.22 142 / 0.08)",
          }}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{ fontFamily: '"Geist Mono", monospace' }}
          >
            <Eye
              className="w-3 h-3 shrink-0"
              style={{ color: "oklch(0.72 0.2 200)" }}
            />
            <span
              className="text-xs tracking-wider"
              style={{ color: "oklch(0.42 0.05 200)" }}
            >
              TOTAL VISITORS:
            </span>
            <span
              className="text-xs font-bold"
              style={{
                color: "oklch(0.82 0.22 142)",
                textShadow: "0 0 8px oklch(0.82 0.22 142 / 0.6)",
              }}
            >
              {visitorStatsQuery.data
                ? Number(visitorStatsQuery.data.totalVisits).toLocaleString()
                : "—"}
            </span>
          </div>

          <div
            className="w-px self-stretch"
            style={{ background: "oklch(0.82 0.22 142 / 0.12)" }}
          />

          <div
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{ fontFamily: '"Geist Mono", monospace' }}
          >
            <Users
              className="w-3 h-3 shrink-0"
              style={{ color: "oklch(0.72 0.25 142)" }}
            />
            <span
              className="text-xs tracking-wider"
              style={{ color: "oklch(0.42 0.05 200)" }}
            >
              ONLINE NOW:
            </span>
            <span
              className="text-xs font-bold"
              style={{
                color: "oklch(0.75 0.25 142)",
                textShadow: "0 0 8px oklch(0.75 0.25 142 / 0.7)",
              }}
            >
              {visitorStatsQuery.data
                ? Number(visitorStatsQuery.data.onlineNow).toLocaleString()
                : "—"}
            </span>
            {visitorStatsQuery.data &&
              Number(visitorStatsQuery.data.onlineNow) > 0 && (
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                  style={{
                    background: "oklch(0.75 0.25 142)",
                    boxShadow: "0 0 5px oklch(0.75 0.25 142 / 0.9)",
                    animation: "dotPulse 1.4s ease-in-out infinite",
                  }}
                />
              )}
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col items-start justify-start px-4 sm:px-6 py-5 relative z-10 gap-5">
        {/* ─── WinGo Timer Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg circuit-border rounded-xl overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.1 0.015 240), oklch(0.08 0.01 240))",
            boxShadow:
              "0 0 40px oklch(0.82 0.22 142 / 0.08), 0 20px 80px oklch(0.05 0.01 240 / 0.9)",
          }}
        >
          {/* Card header */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{
              background: "oklch(0.09 0.015 230)",
              borderBottom: "1px solid oklch(0.82 0.22 142 / 0.15)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "oklch(0.82 0.22 142)",
                  boxShadow: "0 0 6px oklch(0.82 0.22 142 / 0.8)",
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
                WINGO 1-MIN PREDICTION
              </span>
            </div>
            <Shield
              className="w-4 h-4"
              style={{ color: "oklch(0.82 0.22 142 / 0.5)" }}
            />
          </div>

          {/* Period Number */}
          <div
            className="px-5 pt-4 pb-3"
            style={{ borderBottom: "1px solid oklch(0.82 0.22 142 / 0.08)" }}
          >
            <p
              className="text-xs tracking-widest mb-1"
              style={{
                color: "oklch(0.4 0.05 200)",
                fontFamily: '"Geist Mono", monospace',
              }}
            >
              PERIOD NUMBER
            </p>
            <motion.p
              key={displayPeriod.toString()}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl sm:text-2xl font-bold tracking-widest neon-blue"
              style={{ fontFamily: '"Geist Mono", monospace' }}
            >
              {formatPeriodNumber(displayPeriod)}
            </motion.p>
          </div>

          {/* Countdown Timer */}
          <div className="px-5 py-4">
            <p
              className="text-xs tracking-widest mb-2"
              style={{
                color: "oklch(0.4 0.05 200)",
                fontFamily: '"Geist Mono", monospace',
              }}
            >
              TIME REMAINING
            </p>
            <div className="flex items-center gap-4">
              <div
                className={`text-5xl sm:text-6xl font-bold tracking-widest ${
                  isUrgent ? "urgent-flash neon-red" : "neon-green"
                }`}
                style={{ fontFamily: '"Geist Mono", monospace' }}
              >
                {formatCountdown(seconds)}
              </div>
              <div className="flex-1">
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "oklch(0.12 0.02 240)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(seconds / 60) * 100}%`,
                      background:
                        seconds <= 15
                          ? "oklch(0.65 0.28 22)"
                          : "oklch(0.82 0.22 142)",
                      boxShadow:
                        seconds <= 15
                          ? "0 0 8px oklch(0.65 0.28 22 / 0.7)"
                          : "0 0 8px oklch(0.82 0.22 142 / 0.7)",
                      transition: "width 1s linear, background 0.3s ease",
                    }}
                  />
                </div>
                <p
                  className="text-xs mt-1"
                  style={{
                    color: "oklch(0.35 0.04 200)",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  {seconds <= 15 ? "⚡ NEXT PERIOD SOON" : "PERIOD RUNNING"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── 2-Number Input Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-lg"
        >
          <div
            className="circuit-border rounded-xl overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, oklch(0.09 0.015 220), oklch(0.07 0.01 230))",
              boxShadow:
                "0 0 25px oklch(0.78 0.22 200 / 0.1), 0 0 50px oklch(0.78 0.22 200 / 0.05)",
              borderColor: "oklch(0.72 0.2 200 / 0.3)",
            }}
          >
            {/* Section header */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{
                background: "oklch(0.1 0.018 220)",
                borderBottom: "1px solid oklch(0.72 0.2 200 / 0.2)",
              }}
            >
              <div className="flex items-center gap-2">
                <Plus
                  className="w-4 h-4"
                  style={{ color: "oklch(0.78 0.22 200)" }}
                />
                <span
                  className="text-xs tracking-widest font-bold"
                  style={{
                    color: "oklch(0.78 0.22 200)",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  ENTER LAST 2 NUMBERS
                </span>
              </div>
              <span
                className="text-xs tracking-wider"
                style={{
                  color: "oklch(0.45 0.06 200)",
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                0–9 CALC
              </span>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Two single-digit inputs side by side */}
              <div className="flex items-end gap-4">
                {/* Last Number 1 */}
                <div className="flex-1">
                  <label
                    htmlFor="input-num1"
                    className="block text-xs tracking-widest mb-2 font-bold"
                    style={{
                      color: "oklch(0.72 0.2 200)",
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    LAST NUMBER 1
                  </label>
                  <input
                    id="input-num1"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={num1}
                    data-ocid="calc.input.1"
                    onChange={(e) => handleNum1Change(e.target.value)}
                    placeholder="0-9"
                    className="w-full px-3 py-4 rounded-lg text-center text-3xl font-bold tracking-widest outline-none transition-all"
                    style={{
                      background: "oklch(0.08 0.012 220)",
                      border: num1
                        ? "2px solid oklch(0.72 0.2 200 / 0.8)"
                        : "2px solid oklch(0.72 0.2 200 / 0.3)",
                      color: "oklch(0.88 0.18 200)",
                      fontFamily: '"Geist Mono", monospace',
                      boxShadow: num1
                        ? "0 0 12px oklch(0.72 0.2 200 / 0.3), inset 0 0 8px oklch(0.72 0.2 200 / 0.05)"
                        : "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border =
                        "2px solid oklch(0.72 0.2 200 / 0.9)";
                      e.currentTarget.style.boxShadow =
                        "0 0 16px oklch(0.72 0.2 200 / 0.4)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = num1
                        ? "2px solid oklch(0.72 0.2 200 / 0.8)"
                        : "2px solid oklch(0.72 0.2 200 / 0.3)";
                      e.currentTarget.style.boxShadow = num1
                        ? "0 0 12px oklch(0.72 0.2 200 / 0.3)"
                        : "none";
                    }}
                  />
                </div>

                {/* Plus symbol */}
                <div
                  className="flex items-center justify-center w-10 h-12 rounded-lg shrink-0 mb-0.5"
                  style={{
                    color: "oklch(0.6 0.08 200)",
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                  }}
                >
                  +
                </div>

                {/* Last Number 2 */}
                <div className="flex-1">
                  <label
                    htmlFor="input-num2"
                    className="block text-xs tracking-widest mb-2 font-bold"
                    style={{
                      color: "oklch(0.78 0.22 200)",
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    LAST NUMBER 2
                  </label>
                  <input
                    id="input-num2"
                    ref={num2Ref}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={num2}
                    data-ocid="calc.input.2"
                    onChange={(e) => handleNum2Change(e.target.value)}
                    placeholder="0-9"
                    className="w-full px-3 py-4 rounded-lg text-center text-3xl font-bold tracking-widest outline-none transition-all"
                    style={{
                      background: "oklch(0.08 0.012 220)",
                      border: num2
                        ? "2px solid oklch(0.78 0.22 200 / 0.8)"
                        : "2px solid oklch(0.78 0.22 200 / 0.3)",
                      color: "oklch(0.88 0.18 200)",
                      fontFamily: '"Geist Mono", monospace',
                      boxShadow: num2
                        ? "0 0 12px oklch(0.78 0.22 200 / 0.3), inset 0 0 8px oklch(0.78 0.22 200 / 0.05)"
                        : "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border =
                        "2px solid oklch(0.78 0.22 200 / 0.9)";
                      e.currentTarget.style.boxShadow =
                        "0 0 16px oklch(0.78 0.22 200 / 0.4)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = num2
                        ? "2px solid oklch(0.78 0.22 200 / 0.8)"
                        : "2px solid oklch(0.78 0.22 200 / 0.3)";
                      e.currentTarget.style.boxShadow = num2
                        ? "0 0 12px oklch(0.78 0.22 200 / 0.3)"
                        : "none";
                    }}
                  />
                </div>
              </div>

              {/* Calculation Result Display */}
              <AnimatePresence mode="wait">
                {bothEntered && resultDigit !== null && resultLabel !== null ? (
                  <motion.div
                    key={`result-${num1}-${num2}`}
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: isBig
                        ? "linear-gradient(135deg, oklch(0.1 0.03 142 / 0.9), oklch(0.08 0.02 142 / 0.7))"
                        : "linear-gradient(135deg, oklch(0.1 0.03 22 / 0.9), oklch(0.08 0.02 22 / 0.7))",
                      border: isBig
                        ? "1px solid oklch(0.82 0.22 142 / 0.5)"
                        : "1px solid oklch(0.65 0.28 22 / 0.5)",
                      boxShadow: isBig
                        ? "0 0 20px oklch(0.82 0.22 142 / 0.2), 0 0 40px oklch(0.82 0.22 142 / 0.1)"
                        : "0 0 20px oklch(0.65 0.28 22 / 0.2), 0 0 40px oklch(0.65 0.28 22 / 0.1)",
                    }}
                  >
                    {/* Formula line */}
                    <div
                      className="px-4 py-2 flex items-center justify-center gap-2"
                      style={{
                        borderBottom: isBig
                          ? "1px solid oklch(0.82 0.22 142 / 0.15)"
                          : "1px solid oklch(0.65 0.28 22 / 0.15)",
                      }}
                    >
                      <span
                        className="text-sm font-bold tracking-widest"
                        style={{
                          color: "oklch(0.88 0.18 200)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        {num1}
                      </span>
                      <span
                        style={{
                          color: "oklch(0.5 0.06 200)",
                          fontFamily: '"Geist Mono", monospace',
                          fontSize: "1rem",
                        }}
                      >
                        +
                      </span>
                      <span
                        className="text-sm font-bold tracking-widest"
                        style={{
                          color: "oklch(0.88 0.18 200)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        {num2}
                      </span>
                      <span
                        style={{
                          color: "oklch(0.5 0.06 200)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        =
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: "oklch(0.88 0.22 60)",
                          fontFamily: '"Geist Mono", monospace',
                          textShadow: "0 0 8px oklch(0.88 0.22 60 / 0.5)",
                        }}
                      >
                        {sumVal}
                      </span>
                      <span
                        style={{
                          color: "oklch(0.4 0.05 200)",
                          fontFamily: '"Geist Mono", monospace',
                          fontSize: "0.7rem",
                        }}
                      >
                        → last digit →
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: "oklch(0.92 0.22 60)",
                          fontFamily: '"Geist Mono", monospace',
                          textShadow: "0 0 10px oklch(0.92 0.22 60 / 0.7)",
                        }}
                      >
                        {resultDigit}
                      </span>
                    </div>

                    {/* BIG / SMALL result */}
                    <div className="py-4 text-center">
                      <motion.p
                        key={resultLabel}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-6xl sm:text-7xl font-bold tracking-wider"
                        style={{
                          fontFamily: '"Geist Mono", monospace',
                          color: isBig
                            ? "oklch(0.82 0.22 142)"
                            : "oklch(0.65 0.28 22)",
                          textShadow: isBig
                            ? "0 0 20px oklch(0.82 0.22 142 / 0.7), 0 0 40px oklch(0.82 0.22 142 / 0.4)"
                            : "0 0 20px oklch(0.65 0.28 22 / 0.7), 0 0 40px oklch(0.65 0.28 22 / 0.4)",
                        }}
                      >
                        {resultLabel}
                      </motion.p>
                      <p
                        className="text-xs mt-1 tracking-widest"
                        style={{
                          color: isBig
                            ? "oklch(0.55 0.12 142)"
                            : "oklch(0.55 0.15 22)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        {isBig ? "Result ≥ 5 → BIG" : "Result < 5 → SMALL"}
                      </p>
                    </div>

                    {/* Add to AI History button */}
                    <div
                      className="px-4 pb-4"
                      style={{
                        borderTop: isBig
                          ? "1px solid oklch(0.82 0.22 142 / 0.15)"
                          : "1px solid oklch(0.65 0.28 22 / 0.15)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleAddResult}
                        data-ocid="calc.submit_button"
                        className="w-full mt-3 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                          background: isBig
                            ? "oklch(0.82 0.22 142)"
                            : "oklch(0.65 0.28 22)",
                          color: "oklch(0.05 0.01 240)",
                          fontFamily: '"Geist Mono", monospace',
                          letterSpacing: "0.12em",
                          boxShadow: isBig
                            ? "0 0 12px oklch(0.82 0.22 142 / 0.4)"
                            : "0 0 12px oklch(0.65 0.28 22 / 0.4)",
                        }}
                      >
                        ➕ ADD TO AI ANALYSIS HISTORY
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-5 text-center rounded-xl"
                    style={{
                      background: "oklch(0.075 0.01 220)",
                      border: "1px dashed oklch(0.72 0.2 200 / 0.2)",
                    }}
                  >
                    <p
                      className="text-xs tracking-widest"
                      style={{
                        color: "oklch(0.38 0.05 200)",
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      ENTER BOTH NUMBERS TO SEE RESULT
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ─── DEEPSEEK R1 AI Analysis Panel ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-lg"
        >
          <div
            className="circuit-border rounded-xl overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, oklch(0.09 0.014 210), oklch(0.07 0.01 220))",
              boxShadow:
                "0 0 30px oklch(0.78 0.22 200 / 0.12), 0 0 60px oklch(0.78 0.22 200 / 0.06)",
              borderColor: "oklch(0.72 0.2 200 / 0.35)",
            }}
          >
            {/* Panel header */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{
                background: "oklch(0.1 0.018 210)",
                borderBottom: "1px solid oklch(0.78 0.22 200 / 0.2)",
              }}
            >
              <div className="flex items-center gap-2">
                <Cpu
                  className="w-4 h-4"
                  style={{ color: "oklch(0.78 0.22 200)" }}
                />
                <span
                  className="text-xs tracking-widest font-bold"
                  style={{
                    color: "oklch(0.78 0.22 200)",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  🤖 DEEPSEEK R1 AI ANALYSIS
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs"
                  style={{
                    color: "oklch(0.42 0.06 200)",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  {resultHistory.length}/{MAX_HISTORY}
                </span>
                <Activity
                  className="w-3.5 h-3.5"
                  style={{ color: "oklch(0.72 0.2 200 / 0.6)" }}
                />
              </div>
            </div>

            {resultHistory.length < 3 ? (
              /* Not enough data state */
              <div className="px-5 py-8 text-center" data-ocid="ai.empty_state">
                <p
                  className="text-xs tracking-widest mb-2"
                  style={{
                    color: "oklch(0.45 0.06 200)",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  ⏳ COLLECTING DATA...
                </p>
                <p
                  className="text-xs"
                  style={{
                    color: "oklch(0.32 0.04 200)",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  Add at least 3 results to activate AI analysis
                </p>
                <div
                  className="mt-3 flex justify-center gap-1.5"
                  aria-hidden="true"
                >
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          resultHistory.length >= i
                            ? "oklch(0.82 0.22 142)"
                            : "oklch(0.2 0.02 240)",
                        boxShadow:
                          resultHistory.length >= i
                            ? "0 0 6px oklch(0.82 0.22 142 / 0.6)"
                            : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : analysis ? (
              <div className="px-5 py-4 space-y-3">
                {/* ─── Entry Status Banner ─── */}
                <AnimatePresence mode="wait">
                  {analysis.entryAllowed ? (
                    <motion.div
                      key="entry-allowed"
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      data-ocid="ai.success_state"
                      className="px-4 py-3 rounded-lg flex items-center justify-center gap-2"
                      style={{
                        background: "oklch(0.1 0.03 142 / 0.8)",
                        border: "1px solid oklch(0.82 0.22 142 / 0.5)",
                        boxShadow:
                          "0 0 16px oklch(0.82 0.22 142 / 0.2), 0 0 32px oklch(0.82 0.22 142 / 0.1)",
                        animation: "entryGlow 2s ease-in-out infinite",
                      }}
                    >
                      <span
                        className="text-sm font-bold tracking-widest text-center"
                        style={{
                          color: "oklch(0.88 0.22 142)",
                          fontFamily: '"Geist Mono", monospace',
                          textShadow: "0 0 10px oklch(0.82 0.22 142 / 0.6)",
                        }}
                      >
                        ✅ ENTRY ALLOWED — SURESHOT PREDICTION
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="entry-blocked"
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      data-ocid="ai.error_state"
                      className="px-4 py-3 rounded-lg"
                      style={{
                        background: "oklch(0.13 0.03 22 / 0.8)",
                        border: "1px solid oklch(0.65 0.28 22 / 0.5)",
                        boxShadow: "0 0 12px oklch(0.65 0.28 22 / 0.15)",
                      }}
                    >
                      <p
                        className="text-sm font-bold tracking-widest text-center"
                        style={{
                          color: "oklch(0.72 0.28 22)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        ❌ RISK — NO ENTRY ALLOWED
                      </p>
                      <p
                        className="text-xs text-center mt-1 tracking-wider"
                        style={{
                          color: "oklch(0.5 0.12 22)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        Wait for next period
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Streak */}
                  <div
                    className="px-3 py-2.5 rounded"
                    style={{
                      background: "oklch(0.085 0.012 240)",
                      border: `1px solid ${analysis.streakAlert ? "oklch(0.88 0.22 60 / 0.4)" : "oklch(0.72 0.2 200 / 0.15)"}`,
                    }}
                  >
                    <p
                      className="text-xs tracking-wider mb-1"
                      style={{
                        color: "oklch(0.4 0.05 200)",
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      🔥 STREAK
                    </p>
                    <p
                      className="text-xl font-bold"
                      style={{
                        color: analysis.streakAlert
                          ? "oklch(0.88 0.22 60)"
                          : "oklch(0.78 0.22 200)",
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      {analysis.streak}{" "}
                      <span className="text-sm">{analysis.streakType}</span>
                    </p>
                  </div>

                  {/* DeepSeek R1 Prediction */}
                  <div
                    className="px-3 py-2.5 rounded"
                    style={{
                      background:
                        analysis.aiPrediction === "BIG"
                          ? "oklch(0.1 0.025 142 / 0.5)"
                          : "oklch(0.1 0.025 22 / 0.5)",
                      border: `1px solid ${analysis.aiPrediction === "BIG" ? "oklch(0.82 0.22 142 / 0.35)" : "oklch(0.65 0.28 22 / 0.35)"}`,
                    }}
                  >
                    <p
                      className="text-xs tracking-wider mb-1"
                      style={{
                        color: "oklch(0.4 0.05 200)",
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      🤖 DEEPSEEK R1
                    </p>
                    <p
                      className="text-xl font-bold"
                      style={{
                        color:
                          analysis.aiPrediction === "BIG"
                            ? "oklch(0.82 0.22 142)"
                            : "oklch(0.65 0.28 22)",
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      {analysis.aiPrediction}
                      <span
                        className="text-xs ml-1"
                        style={{ color: "oklch(0.5 0.06 200)" }}
                      >
                        {analysis.aiConfidence}%
                      </span>
                    </p>
                  </div>
                </div>

                {/* Probability bars */}
                <div
                  className="px-3 py-3 rounded space-y-2"
                  style={{
                    background: "oklch(0.085 0.012 240)",
                    border: "1px solid oklch(0.72 0.2 200 / 0.12)",
                  }}
                >
                  {/* BIG */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span
                        className="text-xs tracking-wider"
                        style={{
                          color: "oklch(0.82 0.22 142)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        📈 BIG
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: "oklch(0.82 0.22 142)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        {analysis.bigProb}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "oklch(0.12 0.02 240)" }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.bigProb}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: "oklch(0.82 0.22 142)",
                          boxShadow: "0 0 6px oklch(0.82 0.22 142 / 0.5)",
                        }}
                      />
                    </div>
                  </div>

                  {/* SMALL */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span
                        className="text-xs tracking-wider"
                        style={{
                          color: "oklch(0.65 0.28 22)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        📉 SMALL
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: "oklch(0.65 0.28 22)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        {analysis.smallProb}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "oklch(0.12 0.02 240)" }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.smallProb}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: "oklch(0.65 0.28 22)",
                          boxShadow: "0 0 6px oklch(0.65 0.28 22 / 0.5)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Streak Alert */}
                {analysis.streakAlert && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded"
                    style={{
                      background: "oklch(0.13 0.03 60 / 0.7)",
                      border: "1px solid oklch(0.88 0.22 60 / 0.5)",
                      boxShadow: "0 0 12px oklch(0.88 0.22 60 / 0.15)",
                    }}
                  >
                    <AlertTriangle
                      className="w-4 h-4 shrink-0"
                      style={{ color: "oklch(0.88 0.22 60)" }}
                    />
                    <p
                      className="text-xs font-bold tracking-wider"
                      style={{
                        color: "oklch(0.88 0.22 60)",
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      ⚠️ ALERT: High Streak — Reversal Possible
                    </p>
                  </motion.div>
                )}

                {/* Clear history */}
                <button
                  type="button"
                  onClick={handleClearHistory}
                  data-ocid="ai.delete_button"
                  className="w-full py-2 rounded text-xs font-bold tracking-widest transition-all hover:opacity-80"
                  style={{
                    background: "oklch(0.1 0.015 240)",
                    border: "1px solid oklch(0.65 0.28 22 / 0.3)",
                    color: "oklch(0.55 0.18 22)",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  🗑 CLEAR HISTORY
                </button>
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* ─── Visitor / Result History ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-lg"
        >
          <div
            className="circuit-border rounded-xl overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, oklch(0.09 0.012 240), oklch(0.07 0.008 240))",
              boxShadow: "0 0 20px oklch(0.82 0.22 142 / 0.05)",
            }}
          >
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{
                background: "oklch(0.09 0.015 230)",
                borderBottom: "1px solid oklch(0.82 0.22 142 / 0.15)",
              }}
            >
              <div className="flex items-center gap-2">
                <Trophy
                  className="w-4 h-4"
                  style={{ color: "oklch(0.82 0.22 45)" }}
                />
                <span
                  className="text-xs tracking-widest font-bold"
                  style={{
                    color: "oklch(0.82 0.22 45)",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  RESULT HISTORY
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <History
                  className="w-3.5 h-3.5"
                  style={{ color: "oklch(0.45 0.06 200)" }}
                />
                <span
                  className="text-xs"
                  style={{
                    color: "oklch(0.45 0.06 200)",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  LAST {MAX_HISTORY}
                </span>
              </div>
            </div>

            <div className="px-4 py-3">
              {resultHistory.length === 0 ? (
                <div
                  className="py-8 text-center"
                  data-ocid="history.empty_state"
                >
                  <p
                    className="text-xs tracking-widest"
                    style={{
                      color: "oklch(0.35 0.04 200)",
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    NO RESULTS YET — ADD NUMBERS ABOVE
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Table head */}
                  <div
                    className="grid grid-cols-4 gap-2 px-3 py-1.5 rounded text-xs"
                    style={{
                      color: "oklch(0.38 0.05 200)",
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    <span className="tracking-wider">#PERIOD</span>
                    <span className="text-center tracking-wider">CALC</span>
                    <span className="text-center tracking-wider">RESULT</span>
                    <span className="text-right tracking-wider">B/S</span>
                  </div>

                  <AnimatePresence>
                    {resultHistory.map((entry, idx) => {
                      const entryIsBig = entry.result === "BIG";
                      return (
                        <motion.div
                          key={`${entry.period}-${entry.timestamp}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: idx * 0.03 }}
                          data-ocid={`history.item.${idx + 1}`}
                          className="grid grid-cols-4 gap-2 px-3 py-2 rounded items-center"
                          style={{
                            background:
                              idx === 0
                                ? entryIsBig
                                  ? "oklch(0.1 0.025 142 / 0.6)"
                                  : "oklch(0.1 0.025 22 / 0.6)"
                                : "oklch(0.085 0.01 240)",
                            border:
                              idx === 0
                                ? `1px solid ${entryIsBig ? "oklch(0.82 0.22 142 / 0.25)" : "oklch(0.65 0.28 22 / 0.25)"}`
                                : "1px solid oklch(0.14 0.015 240)",
                          }}
                        >
                          {/* Period */}
                          <span
                            className="text-xs truncate"
                            style={{
                              color: "oklch(0.45 0.06 200)",
                              fontFamily: '"Geist Mono", monospace',
                              fontSize: "0.6rem",
                            }}
                          >
                            {entry.period.slice(-6)}
                          </span>

                          {/* Calc */}
                          <span
                            className="text-xs text-center"
                            style={{
                              color: "oklch(0.55 0.1 60)",
                              fontFamily: '"Geist Mono", monospace',
                              fontSize: "0.65rem",
                            }}
                          >
                            {entry.num1}+{entry.num2}={entry.resultDigit}
                          </span>

                          {/* Result badge */}
                          <div className="flex justify-center">
                            <span
                              className="text-xs font-bold tracking-widest px-2 py-0.5 rounded"
                              style={{
                                background: entryIsBig
                                  ? "oklch(0.82 0.22 142 / 0.15)"
                                  : "oklch(0.65 0.28 22 / 0.15)",
                                color: entryIsBig
                                  ? "oklch(0.82 0.22 142)"
                                  : "oklch(0.65 0.28 22)",
                                fontFamily: '"Geist Mono", monospace',
                                boxShadow: entryIsBig
                                  ? "0 0 5px oklch(0.82 0.22 142 / 0.25)"
                                  : "0 0 5px oklch(0.65 0.28 22 / 0.25)",
                                fontSize: "0.6rem",
                              }}
                            >
                              {entry.result}
                            </span>
                          </div>

                          {/* BIG/SMALL indicator */}
                          <div className="flex justify-end">
                            <span>{entryIsBig ? "🟢" : "🔴"}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* ─── Bottom CTAs ─── */}
      <div className="relative z-10 px-4 pb-4 sm:px-6 space-y-3">
        {/* Telegram Box */}
        <div
          className="max-w-lg rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 circuit-border"
          data-ocid="telegram.card"
          style={{
            background: "oklch(0.09 0.01 230)",
            borderColor: "oklch(0.72 0.2 200 / 0.3)",
          }}
        >
          <div>
            <p
              className="text-xs font-bold tracking-widest"
              style={{
                color: "oklch(0.55 0.08 200)",
                fontFamily: '"Geist Mono", monospace',
              }}
            >
              🔐 NEED PASSWORD? MESSAGE US ON TELEGRAM
            </p>
            <p
              className="text-xs mt-0.5 tracking-wider"
              style={{
                color: "oklch(0.38 0.05 200)",
                fontFamily: '"Geist Mono", monospace',
              }}
            >
              Password chahiye to message karo 👇
            </p>
          </div>
          <a
            href="https://t.me/propredictiongowin"
            target="_blank"
            rel="noopener noreferrer"
            data-ocid="telegram.link"
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-bold tracking-widest transition-all hover:scale-105 shrink-0"
            style={{
              background: "oklch(0.46 0.18 230)",
              color: "oklch(0.97 0 0)",
              fontFamily: '"Geist Mono", monospace',
              boxShadow: "0 0 10px oklch(0.46 0.18 230 / 0.4)",
              textDecoration: "none",
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" />📱 TELEGRAM
          </a>
        </div>

        {/* Register Box */}
        <div
          className="max-w-lg rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3"
          data-ocid="register.card"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.1 0.02 60 / 0.8), oklch(0.08 0.015 55 / 0.8))",
            border: "1px solid oklch(0.72 0.25 60 / 0.4)",
            boxShadow: "0 0 20px oklch(0.72 0.25 60 / 0.1)",
          }}
        >
          <div>
            <p
              className="text-xs font-bold tracking-widest"
              style={{
                color: "oklch(0.82 0.22 60)",
                fontFamily: '"Geist Mono", monospace',
                textShadow: "0 0 8px oklch(0.82 0.22 60 / 0.4)",
              }}
            >
              🔗 REGISTER & START WINNING ⚡ LOTTERY LINK
            </p>
            <p
              className="text-xs mt-0.5 tracking-wider"
              style={{
                color: "oklch(0.55 0.12 60)",
                fontFamily: '"Geist Mono", monospace',
              }}
            >
              New account? Register & start playing
            </p>
          </div>
          <a
            href="https://www.hyderabad91.com/#/register?invitationCode=4841620269921"
            target="_blank"
            rel="noopener noreferrer"
            data-ocid="register.link"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-xs font-bold tracking-widest transition-all hover:scale-105 shrink-0"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.22 140), oklch(0.65 0.25 145))",
              color: "oklch(0.05 0.01 240)",
              fontFamily: '"Geist Mono", monospace',
              boxShadow:
                "0 0 16px oklch(0.72 0.22 140 / 0.5), 0 0 32px oklch(0.72 0.22 140 / 0.25)",
              textDecoration: "none",
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            REGISTER NOW 🎯
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-2 max-w-lg"
          style={{
            color: "oklch(0.25 0.02 200)",
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.45 0.1 142)", textDecoration: "none" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .text-marquee {
          display: inline-block;
          animation: marquee 28s linear infinite;
        }
        @keyframes entryGlow {
          0%, 100% { box-shadow: 0 0 16px oklch(0.82 0.22 142 / 0.2), 0 0 32px oklch(0.82 0.22 142 / 0.1); }
          50% { box-shadow: 0 0 24px oklch(0.82 0.22 142 / 0.5), 0 0 48px oklch(0.82 0.22 142 / 0.25); }
        }
      `}</style>
    </div>
  );
}
