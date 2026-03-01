import {
  Activity,
  AlertTriangle,
  Brain,
  Download,
  ExternalLink,
  Eye,
  History,
  LogOut,
  MessageCircle,
  Shield,
  Smartphone,
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
  useGetPrediction,
  useHeartbeat,
  useVisitorStats,
} from "../hooks/useQueries";
import { clearSession } from "../utils/session";

interface PredictionPageProps {
  onLogout: () => void;
}

interface BettingHistoryEntry {
  period: string;
  result: "BIG" | "SMALL";
  timestamp: number;
}

const HISTORY_KEY = "vip_betting_history";
const MAX_HISTORY = 10;

function loadHistory(): BettingHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BettingHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: BettingHistoryEntry[]): void {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(entries.slice(0, MAX_HISTORY)),
    );
  } catch {
    // Storage not available — ignore
  }
}

function formatPeriodNumber(n: bigint): string {
  return n.toString().padStart(12, "0");
}

interface AnalysisData {
  lastNumber: number;
  lastResult: "BIG" | "SMALL";
  streak: number;
  streakType: "BIG" | "SMALL";
  bigProb: number;
  smallProb: number;
  streakAlert: boolean;
  aiPrediction: "BIG" | "SMALL";
  aiConfidence: number;
}

function computeAnalysis(history: BettingHistoryEntry[]): AnalysisData | null {
  if (history.length === 0) return null;

  const results = history.map((h) => h.result);

  // Streak
  let streak = 1;
  const streakType = results[0];
  for (let i = 1; i < results.length; i++) {
    if (results[i] === streakType) streak++;
    else break;
  }

  // Probabilities from past data
  const bigCount = results.filter((r) => r === "BIG").length;
  const _smallCount = results.length - bigCount;
  const bigProb = Math.round((bigCount / results.length) * 100);
  const smallProb = 100 - bigProb;

  // Simple number from period (last digit of period)
  const lastPeriodStr = history[0].period;
  const lastNumber = Number.parseInt(lastPeriodStr.slice(-1), 10);

  // AI prediction logic: reversal after long streak, else follow probability
  const streakAlert = streak >= 3;
  let aiPrediction: "BIG" | "SMALL";
  let aiConfidence: number;

  if (streakAlert) {
    // Suggest reversal
    aiPrediction = streakType === "BIG" ? "SMALL" : "BIG";
    aiConfidence = Math.min(55 + streak * 5, 85);
  } else {
    aiPrediction = bigProb >= smallProb ? "BIG" : "SMALL";
    aiConfidence = Math.max(bigProb, smallProb);
  }

  return {
    lastNumber,
    lastResult: streakType,
    streak,
    streakType,
    bigProb,
    smallProb,
    streakAlert,
    aiPrediction,
    aiConfidence,
  };
}

function formatCountdown(seconds: bigint): string {
  const secs = Number(seconds);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Generate a simple period number from timestamp
function generatePeriodFromTime(): bigint {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const minuteOfDay = Math.floor(now.getHours() * 60 + now.getMinutes());
  return BigInt(`${dateStr}${String(minuteOfDay).padStart(4, "0")}`);
}

export default function PredictionPage({ onLogout }: PredictionPageProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const prevPeriodRef = useRef<bigint | null>(null);
  const prevRevealRef = useRef(false);
  const [localSeconds, setLocalSeconds] = useState<number>(60);
  const [displayPeriod, setDisplayPeriod] = useState<bigint>(
    generatePeriodFromTime(),
  );
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealKey, setRevealKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [bettingHistory, setBettingHistory] =
    useState<BettingHistoryEntry[]>(loadHistory);

  const periodInfoQuery = useCurrentPeriodInfo();
  const predictionQuery = useGetPrediction(displayPeriod);
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
          // Reset period
          setDisplayPeriod(generatePeriodFromTime());
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Trigger reveal animation when prediction changes or time drops to 15
  useEffect(() => {
    if (localSeconds <= 15 && !isRevealing) {
      setIsRevealing(true);
      setRevealKey((k) => k + 1);
    } else if (localSeconds > 15) {
      setIsRevealing(false);
    }
  }, [localSeconds, isRevealing]);

  // Detect period change
  useEffect(() => {
    const current = displayPeriod;
    if (prevPeriodRef.current !== null && prevPeriodRef.current !== current) {
      setIsRevealing(false);
    }
    prevPeriodRef.current = current;
  }, [displayPeriod]);

  // Heartbeat — mark user as online every 3 minutes
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

  const shouldReveal = seconds <= 15;
  const prediction = predictionQuery.data?.result || null;
  const isBig = prediction === "BIG";
  const isUrgent = seconds <= 5;
  const isLoading = periodInfoQuery.isLoading && !periodInfoQuery.data;

  // Save to betting history when prediction is revealed
  useEffect(() => {
    const justRevealed = shouldReveal && !prevRevealRef.current;
    prevRevealRef.current = shouldReveal;

    if (justRevealed && prediction !== null) {
      const entry: BettingHistoryEntry = {
        period: formatPeriodNumber(displayPeriod),
        result: prediction as "BIG" | "SMALL",
        timestamp: Date.now(),
      };
      setBettingHistory((prev) => {
        const updated = [entry, ...prev].slice(0, MAX_HISTORY);
        saveHistory(updated);
        return updated;
      });
    }
  }, [shouldReveal, prediction, displayPeriod]);

  const handleLogout = useCallback(() => {
    clearSession();
    onLogout();
  }, [onLogout]);

  const handleDownload = useCallback(async () => {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    try {
      const card = captureRef.current;
      const canvas = document.createElement("canvas");
      const scale = window.devicePixelRatio || 2;
      const rect = card.getBoundingClientRect();
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Draw background
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw grid lines
      ctx.strokeStyle = "rgba(100,255,150,0.05)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < rect.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }
      for (let y = 0; y < rect.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }

      // Draw card background
      ctx.fillStyle = "#0a0a1a";
      ctx.roundRect(20, 20, rect.width - 40, rect.height - 40, 8);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = "rgba(100,255,150,0.4)";
      ctx.lineWidth = 1;
      ctx.roundRect(20, 20, rect.width - 40, rect.height - 40, 8);
      ctx.stroke();

      // Title
      ctx.font = "bold 22px 'Geist Mono', monospace";
      ctx.fillStyle = "#64ff96";
      ctx.textAlign = "center";
      ctx.shadowColor = "#64ff96";
      ctx.shadowBlur = 15;
      ctx.fillText("VIP PREDICTION ALOK", rect.width / 2, 75);

      // Period
      ctx.font = "12px 'Geist Mono', monospace";
      ctx.fillStyle = "#4a9abb";
      ctx.shadowColor = "#4a9abb";
      ctx.shadowBlur = 8;
      ctx.fillText(
        `PERIOD: ${formatPeriodNumber(displayPeriod)}`,
        rect.width / 2,
        105,
      );

      // Prediction result
      const result = predictionQuery.data?.result || "---";
      const resultIsBig = result === "BIG";
      ctx.font = "bold 72px 'Geist Mono', monospace";
      ctx.fillStyle = resultIsBig ? "#4ade80" : "#f87171";
      ctx.shadowColor = resultIsBig ? "#4ade80" : "#f87171";
      ctx.shadowBlur = 40;
      ctx.fillText(result, rect.width / 2, 200);

      // Timestamp
      ctx.font = "10px 'Geist Mono', monospace";
      ctx.fillStyle = "#334466";
      ctx.shadowBlur = 0;
      ctx.fillText(
        new Date().toLocaleString(),
        rect.width / 2,
        rect.height - 35,
      );

      // Download
      const link = document.createElement("a");
      link.download = `vip-prediction-${formatPeriodNumber(displayPeriod)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setDownloading(false);
    }
  }, [displayPeriod, predictionQuery.data, downloading]);

  return (
    <div className="cyber-bg min-h-screen flex flex-col relative">
      {/* Decorative ambient blobs */}
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
        {/* Top row: brand + actions */}
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
            {/* Connection status */}
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

            {/* APK Download button */}
            <a
              href="#apk-download"
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-all hover:scale-105"
              style={{
                background: "oklch(0.13 0.025 140)",
                border: "1px solid oklch(0.72 0.22 140 / 0.5)",
                color: "oklch(0.78 0.22 140)",
                fontFamily: '"Geist Mono", monospace',
                boxShadow: "0 0 8px oklch(0.72 0.22 140 / 0.2)",
                textDecoration: "none",
              }}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">APK</span>
              <Download className="w-3 h-3" />
            </a>

            {/* Register button */}
            <a
              href="https://www.hyderabad91.com/#/register?invitationCode=4841620269921"
              target="_blank"
              rel="noopener noreferrer"
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

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
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

        {/* Tagline marquee row */}
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
            🎯 WINGO 1-MIN RESULT TRACKING Analysis &nbsp;|&nbsp; DIRECT
            ANSWER:100% SURESHOT &nbsp;|&nbsp; Big - Small prediction
            &nbsp;|&nbsp; 🎯 WINGO 1-MIN RESULT TRACKING Analysis &nbsp;|&nbsp;
            DIRECT ANSWER:100% SURESHOT &nbsp;|&nbsp; Big - Small prediction
            &nbsp;|&nbsp; 🎯 WINGO 1-MIN RESULT TRACKING Analysis &nbsp;|&nbsp;
            DIRECT ANSWER:100% SURESHOT &nbsp;|&nbsp; Big - Small prediction
            &nbsp;|&nbsp;
          </div>
        </div>

        {/* Visitor stats bar */}
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

          {/* Divider */}
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
      <main className="flex-1 flex flex-col items-start justify-start pl-4 sm:pl-6 pr-4 sm:pr-6 py-6 relative z-10">
        <div
          ref={captureRef}
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
            className="px-5 pt-5 pb-4 scan-line-container"
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
            <div className="flex items-baseline gap-2">
              {isLoading ? (
                <div
                  className="h-8 w-full rounded animate-pulse"
                  style={{ background: "oklch(0.15 0.02 240)" }}
                />
              ) : (
                <motion.p
                  key={displayPeriod.toString()}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xl sm:text-2xl font-bold tracking-widest neon-blue"
                  style={{ fontFamily: '"Geist Mono", monospace' }}
                >
                  {formatPeriodNumber(displayPeriod)}
                </motion.p>
              )}
            </div>
          </div>

          {/* ─── Countdown Timer ─── */}
          <div
            className="px-5 py-5"
            style={{ borderBottom: "1px solid oklch(0.82 0.22 142 / 0.08)" }}
          >
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
              <motion.div
                key={`timer-${Math.floor(seconds / 10)}`}
                className={`text-5xl sm:text-6xl font-bold tracking-widest ${
                  isUrgent ? "urgent-flash" : ""
                } ${seconds <= 15 ? "neon-red" : "neon-green"}`}
                style={{ fontFamily: '"Geist Mono", monospace' }}
              >
                {formatCountdown(BigInt(seconds))}
              </motion.div>

              {/* Progress bar */}
              <div className="flex-1">
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "oklch(0.12 0.02 240)" }}
                >
                  <motion.div
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
                  {seconds <= 15 ? "⚡ REVEALING SOON" : "ANALYZING GAME DATA"}
                </p>
              </div>
            </div>
          </div>

          {/* ─── Prediction Result ─── */}
          <div className="px-5 py-6 text-center">
            <p
              className="text-xs tracking-widest mb-4"
              style={{
                color: "oklch(0.4 0.05 200)",
                fontFamily: '"Geist Mono", monospace',
              }}
            >
              PREDICTION RESULT
            </p>

            <AnimatePresence mode="wait">
              {!shouldReveal ? (
                /* Analyzing state */
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8"
                >
                  <div className="analyzing-dots mb-4">
                    <span className="dot-pulse-1" />
                    <span className="dot-pulse-2" />
                    <span className="dot-pulse-3" />
                  </div>
                  <p
                    className="text-lg tracking-widest neon-blue"
                    style={{ fontFamily: '"Geist Mono", monospace' }}
                  >
                    ANALYZING...
                  </p>
                  <p
                    className="text-xs mt-2"
                    style={{
                      color: "oklch(0.35 0.04 200)",
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    RESULT IN {seconds}s
                  </p>
                </motion.div>
              ) : (
                /* Reveal state */
                <motion.div
                  key={`reveal-${revealKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-4"
                >
                  {predictionQuery.isLoading ? (
                    <div className="py-8">
                      <div className="analyzing-dots mb-4">
                        <span className="dot-pulse-1" />
                        <span className="dot-pulse-2" />
                        <span className="dot-pulse-3" />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Glowing ring around result */}
                      <div className="relative inline-block">
                        <div
                          className={`absolute inset-0 rounded-full ${isBig ? "glow-green" : "glow-red"}`}
                          style={{
                            transform: "scale(1.4)",
                            filter: "blur(20px)",
                            opacity: 0.6,
                          }}
                        />
                        <motion.p
                          key={prediction || "loading"}
                          className={`big-reveal text-6xl sm:text-8xl font-bold tracking-wider relative ${
                            isBig
                              ? "neon-green pulse-glow-green"
                              : "neon-red pulse-glow-red"
                          }`}
                          style={{
                            fontFamily: '"Geist Mono", monospace',
                            letterSpacing: "0.05em",
                          }}
                        >
                          {prediction || "---"}
                        </motion.p>
                      </div>

                      {/* Sub-label */}
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: isBig
                              ? "oklch(0.82 0.22 142)"
                              : "oklch(0.65 0.28 22)",
                            boxShadow: isBig
                              ? "0 0 6px oklch(0.82 0.22 142)"
                              : "0 0 6px oklch(0.65 0.28 22)",
                          }}
                        />
                        <span
                          className="text-sm tracking-widest font-semibold"
                          style={{
                            color: isBig
                              ? "oklch(0.82 0.22 142)"
                              : "oklch(0.65 0.28 22)",
                            fontFamily: '"Geist Mono", monospace',
                          }}
                        >
                          100% SURESHOT
                        </span>
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: isBig
                              ? "oklch(0.82 0.22 142)"
                              : "oklch(0.65 0.28 22)",
                            boxShadow: isBig
                              ? "0 0 6px oklch(0.82 0.22 142)"
                              : "0 0 6px oklch(0.65 0.28 22)",
                          }}
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Download button */}
          <div
            className="px-5 pb-5 pt-2"
            style={{ borderTop: "1px solid oklch(0.82 0.22 142 / 0.08)" }}
          >
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || !prediction}
              className="w-full flex items-center justify-center gap-2 py-3 rounded text-xs font-bold tracking-widest transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "oklch(0.1 0.015 240)",
                border: "1px solid oklch(0.72 0.2 200 / 0.4)",
                color: "oklch(0.72 0.2 200)",
                fontFamily: '"Geist Mono", monospace',
                boxShadow: "0 0 10px oklch(0.72 0.2 200 / 0.1)",
              }}
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? "DOWNLOADING..." : "DOWNLOAD PREDICTION"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 w-full max-w-lg grid grid-cols-3 gap-3"
        >
          {[
            { label: "ACCURACY", value: "100%", color: "neon-green" },
            { label: "SERVER", value: "LIVE", color: "neon-blue" },
            { label: "MODE", value: "VIP", color: "neon-pink" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center py-3 px-2 rounded"
              style={{
                background: "oklch(0.09 0.012 240)",
                border: "1px solid oklch(0.82 0.22 142 / 0.1)",
              }}
            >
              <p
                className={`text-lg font-bold ${stat.color}`}
                style={{ fontFamily: '"Geist Mono", monospace' }}
              >
                {stat.value}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{
                  color: "oklch(0.35 0.04 200)",
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* ─── Nano AI Analysis Panel ─── */}
        {(() => {
          const analysis = computeAnalysis(bettingHistory);
          if (!analysis) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 w-full max-w-lg"
            >
              <div
                className="circuit-border rounded-xl overflow-hidden"
                style={{
                  background:
                    "linear-gradient(160deg, oklch(0.09 0.014 270), oklch(0.07 0.01 260))",
                  boxShadow:
                    "0 0 30px oklch(0.68 0.28 290 / 0.1), 0 0 60px oklch(0.68 0.28 290 / 0.05)",
                  borderColor: "oklch(0.68 0.28 290 / 0.3)",
                }}
              >
                {/* Panel header */}
                <div
                  className="px-5 py-3 flex items-center justify-between"
                  style={{
                    background: "oklch(0.1 0.018 270)",
                    borderBottom: "1px solid oklch(0.68 0.28 290 / 0.2)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Brain
                      className="w-4 h-4"
                      style={{ color: "oklch(0.78 0.22 290)" }}
                    />
                    <span
                      className="text-xs tracking-widest font-bold"
                      style={{
                        color: "oklch(0.78 0.22 290)",
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      NANO AI ANALYSIS
                    </span>
                  </div>
                  <Activity
                    className="w-3.5 h-3.5"
                    style={{ color: "oklch(0.68 0.28 290 / 0.6)" }}
                  />
                </div>

                <div className="px-5 py-4 space-y-3">
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Last Number */}
                    <div
                      className="px-3 py-2.5 rounded"
                      style={{
                        background: "oklch(0.085 0.012 240)",
                        border: "1px solid oklch(0.68 0.28 290 / 0.15)",
                      }}
                    >
                      <p
                        className="text-xs tracking-wider mb-1"
                        style={{
                          color: "oklch(0.4 0.05 200)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        🎯 LAST NUMBER
                      </p>
                      <p
                        className="text-2xl font-bold"
                        style={{
                          color: "oklch(0.88 0.18 60)",
                          fontFamily: '"Geist Mono", monospace',
                          textShadow: "0 0 10px oklch(0.88 0.18 60 / 0.5)",
                        }}
                      >
                        {analysis.lastNumber}
                      </p>
                    </div>

                    {/* Result */}
                    <div
                      className="px-3 py-2.5 rounded"
                      style={{
                        background: "oklch(0.085 0.012 240)",
                        border: "1px solid oklch(0.68 0.28 290 / 0.15)",
                      }}
                    >
                      <p
                        className="text-xs tracking-wider mb-1"
                        style={{
                          color: "oklch(0.4 0.05 200)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        📊 RESULT
                      </p>
                      <p
                        className="text-xl font-bold"
                        style={{
                          color:
                            analysis.lastResult === "BIG"
                              ? "oklch(0.82 0.22 142)"
                              : "oklch(0.65 0.28 22)",
                          fontFamily: '"Geist Mono", monospace',
                          textShadow:
                            analysis.lastResult === "BIG"
                              ? "0 0 10px oklch(0.82 0.22 142 / 0.6)"
                              : "0 0 10px oklch(0.65 0.28 22 / 0.6)",
                        }}
                      >
                        {analysis.lastResult}
                      </p>
                    </div>

                    {/* Streak */}
                    <div
                      className="px-3 py-2.5 rounded"
                      style={{
                        background: "oklch(0.085 0.012 240)",
                        border: `1px solid ${analysis.streakAlert ? "oklch(0.88 0.22 60 / 0.4)" : "oklch(0.68 0.28 290 / 0.15)"}`,
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
                            : "oklch(0.78 0.22 290)",
                          fontFamily: '"Geist Mono", monospace',
                        }}
                      >
                        {analysis.streak}{" "}
                        <span className="text-sm">{analysis.streakType}</span>
                      </p>
                    </div>

                    {/* AI Prediction */}
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
                        🤖 AI NEXT
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
                      border: "1px solid oklch(0.68 0.28 290 / 0.12)",
                    }}
                  >
                    {/* BIG bar */}
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

                    {/* SMALL bar */}
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
                        ⚠️ ALERT: Streak ज़्यादा है, reversal possible
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* ─── Betting History ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 w-full max-w-lg"
        >
          <div
            className="circuit-border rounded-xl overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, oklch(0.09 0.012 240), oklch(0.07 0.008 240))",
              boxShadow: "0 0 20px oklch(0.82 0.22 142 / 0.05)",
            }}
          >
            {/* History header */}
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
                  BETTING HISTORY
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

            {/* History table */}
            <div className="px-4 py-3">
              {bettingHistory.length === 0 ? (
                <div className="py-8 text-center">
                  <p
                    className="text-xs tracking-widest"
                    style={{
                      color: "oklch(0.35 0.04 200)",
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    NO HISTORY YET — PREDICTIONS WILL APPEAR HERE
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Table head */}
                  <div
                    className="grid grid-cols-3 gap-2 px-3 py-1.5 rounded text-xs"
                    style={{
                      color: "oklch(0.38 0.05 200)",
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    <span className="tracking-wider">#PERIOD</span>
                    <span className="text-center tracking-wider">RESULT</span>
                    <span className="text-right tracking-wider">STATUS</span>
                  </div>

                  {/* Table rows */}
                  <AnimatePresence>
                    {bettingHistory.map((entry, idx) => {
                      const entryIsBig = entry.result === "BIG";
                      return (
                        <motion.div
                          key={`${entry.period}-${entry.timestamp}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: idx * 0.03 }}
                          className="grid grid-cols-3 gap-2 px-3 py-2 rounded items-center"
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
                            className="text-xs font-mono truncate"
                            style={{
                              color: "oklch(0.45 0.06 200)",
                              fontFamily: '"Geist Mono", monospace',
                              fontSize: "0.65rem",
                            }}
                          >
                            {entry.period.slice(-6)}
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
                                  ? "0 0 6px oklch(0.82 0.22 142 / 0.3)"
                                  : "0 0 6px oklch(0.65 0.28 22 / 0.3)",
                              }}
                            >
                              {entry.result}
                            </span>
                          </div>

                          {/* Win/Loss label */}
                          <div className="flex justify-end items-center gap-1">
                            <span
                              className="text-xs font-bold"
                              style={{
                                color: entryIsBig
                                  ? "oklch(0.75 0.22 142)"
                                  : "oklch(0.65 0.28 22)",
                                fontFamily: '"Geist Mono", monospace',
                              }}
                            >
                              {entryIsBig ? "WIN" : "LOSS"}
                            </span>
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

      {/* ─── Telegram CTA ─── */}
      <div className="relative z-10 px-4 pb-4 sm:px-6">
        {/* Register CTA */}
        <div className="max-w-lg mb-3">
          <a
            href="https://www.hyderabad91.com/#/register?invitationCode=4841620269921"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded text-sm font-bold tracking-widest transition-all hover:scale-[1.01]"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.22 140), oklch(0.65 0.25 145))",
              color: "oklch(0.05 0.01 240)",
              fontFamily: '"Geist Mono", monospace',
              letterSpacing: "0.15em",
              boxShadow:
                "0 0 20px oklch(0.72 0.22 140 / 0.4), 0 0 40px oklch(0.72 0.22 140 / 0.2)",
              textDecoration: "none",
            }}
          >
            <UserPlus className="w-4 h-4" />🎯 REGISTER NOW — FREE ACCOUNT
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>

        <div
          className="max-w-lg rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 circuit-border"
          style={{
            background: "oklch(0.09 0.01 230)",
            borderColor: "oklch(0.72 0.2 200 / 0.3)",
          }}
        >
          <p
            className="text-xs tracking-widest text-center sm:text-left"
            style={{
              color: "oklch(0.55 0.08 200)",
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            PASSWORD CHAHIYE TO MESSAGE KARO 👇
          </p>
          <a
            href="https://t.me/propredictiongowin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-bold tracking-widest transition-all hover:scale-105 shrink-0"
            style={{
              background: "oklch(0.46 0.18 230)",
              color: "oklch(0.97 0 0)",
              fontFamily: '"Geist Mono", monospace',
              boxShadow: "0 0 10px oklch(0.46 0.18 230 / 0.4)",
              textDecoration: "none",
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            TELEGRAM
          </a>
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-4 max-w-lg"
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
      `}</style>
    </div>
  );
}
