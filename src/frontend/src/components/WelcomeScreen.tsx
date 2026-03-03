import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface WelcomeScreenProps {
  onComplete: () => void;
}

// Typing animation hook
function useTypingEffect(text: string, startDelay: number, speed = 45) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let timeout: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;

    timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, startDelay, speed]);

  return { displayed, done };
}

// Matrix rain column
function MatrixColumn({
  left,
  delay,
  duration,
  chars,
}: {
  left: string;
  delay: number;
  duration: number;
  chars: string;
}) {
  return (
    <motion.div
      initial={{ y: "-100%", opacity: 0.8 }}
      animate={{ y: "120vh", opacity: 0 }}
      transition={{
        delay,
        duration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: Math.random() * 3,
      }}
      className="absolute top-0 text-xs leading-4 select-none pointer-events-none"
      style={{
        left,
        color: "oklch(0.82 0.22 142 / 0.35)",
        fontFamily: '"Geist Mono", monospace',
        writingMode: "vertical-rl",
        letterSpacing: "0.2em",
      }}
    >
      {chars}
    </motion.div>
  );
}

const MATRIX_COLS = [
  { left: "3%", delay: 0, duration: 3.5, chars: "10110VIP01" },
  { left: "9%", delay: 0.7, duration: 2.8, chars: "ALOK100WIN" },
  { left: "15%", delay: 1.3, duration: 4.1, chars: "01BIG01001" },
  { left: "22%", delay: 0.4, duration: 3.2, chars: "SURÉSMALOK" },
  { left: "28%", delay: 2.1, duration: 2.6, chars: "WINGO10110" },
  { left: "35%", delay: 0.9, duration: 3.8, chars: "10011VIPAI" },
  { left: "42%", delay: 1.7, duration: 2.9, chars: "BIGWIN0101" },
  { left: "55%", delay: 0.3, duration: 3.4, chars: "01110ALOKV" },
  { left: "63%", delay: 1.5, duration: 2.7, chars: "SHOTWIN100" },
  { left: "70%", delay: 0.8, duration: 4.0, chars: "10101VIP11" },
  { left: "77%", delay: 2.3, duration: 3.1, chars: "ANALYSI001" },
  { left: "84%", delay: 1.1, duration: 2.5, chars: "WIN100SURE" },
  { left: "91%", delay: 0.5, duration: 3.7, chars: "01BIGALOK0" },
  { left: "97%", delay: 1.9, duration: 3.0, chars: "PREDIC1101" },
];

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 2.5s
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  // Play welcome chime
  useEffect(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") return;

      const now = ctx.currentTime;

      // Dramatic 3-note ascending arpeggio
      const notes = [
        { freq: 330, start: 0, end: 0.4 },
        { freq: 440, start: 0.15, end: 0.55 },
        { freq: 660, start: 0.3, end: 0.8 },
      ];

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = note.freq;
        gain.gain.setValueAtTime(0, now + note.start);
        gain.gain.linearRampToValueAtTime(0.18, now + note.start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.end);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.start);
        osc.stop(now + note.end + 0.1);
        osc.onended = () => ctx.close();
      }
    } catch {
      // Silently ignore
    }
  }, []);

  const line1 = useTypingEffect("WELCOME TO", 200, 60);
  const line2 = useTypingEffect("VIP PREDICTION ALOK", 700, 45);
  const line3 = useTypingEffect("Analysis & Prediction System", 1400, 35);
  const line4 = useTypingEffect("DIRECT ANSWER: 100% SURESHOT", 2000, 30);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "oklch(0.04 0.01 240)",
          }}
        >
          {/* Matrix rain columns */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {MATRIX_COLS.map((col) => (
              <MatrixColumn key={col.left} {...col} />
            ))}
          </div>

          {/* Radial glow backdrop */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.82 0.22 142 / 0.06) 0%, transparent 70%)",
            }}
          />

          {/* Scan lines overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0.82 0.22 142 / 0.012) 2px, oklch(0.82 0.22 142 / 0.012) 4px)",
            }}
          />

          {/* Corner decorations */}
          <div className="absolute top-6 left-6 pointer-events-none">
            <div
              style={{
                width: 60,
                height: 60,
                borderTop: "2px solid oklch(0.82 0.22 142 / 0.7)",
                borderLeft: "2px solid oklch(0.82 0.22 142 / 0.7)",
                boxShadow: "inset 0 0 8px oklch(0.82 0.22 142 / 0.15)",
              }}
            />
          </div>
          <div className="absolute top-6 right-6 pointer-events-none">
            <div
              style={{
                width: 60,
                height: 60,
                borderTop: "2px solid oklch(0.82 0.22 142 / 0.7)",
                borderRight: "2px solid oklch(0.82 0.22 142 / 0.7)",
                boxShadow: "inset 0 0 8px oklch(0.82 0.22 142 / 0.15)",
              }}
            />
          </div>
          <div className="absolute bottom-6 left-6 pointer-events-none">
            <div
              style={{
                width: 60,
                height: 60,
                borderBottom: "2px solid oklch(0.82 0.22 142 / 0.7)",
                borderLeft: "2px solid oklch(0.82 0.22 142 / 0.7)",
              }}
            />
          </div>
          <div className="absolute bottom-6 right-6 pointer-events-none">
            <div
              style={{
                width: 60,
                height: 60,
                borderBottom: "2px solid oklch(0.82 0.22 142 / 0.7)",
                borderRight: "2px solid oklch(0.82 0.22 142 / 0.7)",
              }}
            />
          </div>

          {/* Main content */}
          <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
            {/* Flicker badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.1,
                duration: 0.4,
                type: "spring",
                stiffness: 220,
              }}
              className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-sm"
              style={{
                background: "oklch(0.09 0.015 240)",
                border: "1px solid oklch(0.82 0.22 142 / 0.5)",
                boxShadow: "0 0 15px oklch(0.82 0.22 142 / 0.2)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: "oklch(0.82 0.22 142)",
                  boxShadow: "0 0 8px oklch(0.82 0.22 142)",
                  animation: "dotPulse 1.4s ease-in-out infinite",
                  display: "inline-block",
                }}
              />
              <span
                className="text-xs tracking-widest"
                style={{
                  color: "oklch(0.6 0.12 142)",
                  fontFamily: '"Geist Mono", monospace',
                  letterSpacing: "0.2em",
                }}
              >
                SYSTEM ACCESS GRANTED
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: "oklch(0.82 0.22 142)",
                  boxShadow: "0 0 8px oklch(0.82 0.22 142)",
                  animation: "dotPulse 1.4s ease-in-out 0.4s infinite",
                  display: "inline-block",
                }}
              />
            </motion.div>

            {/* LINE 1: WELCOME TO */}
            <div className="mb-2" style={{ minHeight: "2rem" }}>
              <span
                className="text-lg sm:text-xl tracking-[0.4em] font-bold"
                style={{
                  color: "oklch(0.72 0.2 200)",
                  fontFamily: '"Geist Mono", monospace',
                  textShadow:
                    "0 0 10px oklch(0.72 0.2 200 / 0.8), 0 0 30px oklch(0.72 0.2 200 / 0.4)",
                }}
              >
                {line1.displayed}
                {!line1.done && (
                  <span
                    style={{
                      animation: "urgentFlash 0.6s step-end infinite",
                      color: "oklch(0.72 0.2 200)",
                    }}
                  >
                    █
                  </span>
                )}
              </span>
            </div>

            {/* LINE 2: VIP PREDICTION ALOK */}
            <div className="mb-4" style={{ minHeight: "5rem" }}>
              <h1
                className="text-4xl sm:text-6xl font-bold tracking-wider neon-green flicker"
                style={{
                  fontFamily: '"Geist Mono", monospace',
                  letterSpacing: "0.08em",
                  lineHeight: 1.1,
                }}
              >
                {line2.displayed}
                {!line2.done && line1.done && (
                  <span
                    style={{
                      animation: "urgentFlash 0.6s step-end infinite",
                    }}
                  >
                    █
                  </span>
                )}
              </h1>
            </div>

            {/* Horizontal divider */}
            {line2.done && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mx-auto mb-6"
                style={{
                  height: 1,
                  width: "80%",
                  background:
                    "linear-gradient(90deg, transparent, oklch(0.82 0.22 142 / 0.7), transparent)",
                  boxShadow: "0 0 8px oklch(0.82 0.22 142 / 0.5)",
                }}
              />
            )}

            {/* LINE 3: Analysis & Prediction System */}
            <div className="mb-4" style={{ minHeight: "2.5rem" }}>
              <p
                className="text-xl sm:text-2xl font-bold tracking-widest"
                style={{
                  color: "oklch(0.68 0.28 330)",
                  fontFamily: '"Geist Mono", monospace',
                  textShadow:
                    "0 0 10px oklch(0.68 0.28 330 / 0.8), 0 0 30px oklch(0.68 0.28 330 / 0.4)",
                  letterSpacing: "0.15em",
                }}
              >
                {line3.displayed}
                {!line3.done && line2.done && (
                  <span
                    style={{
                      animation: "urgentFlash 0.6s step-end infinite",
                      color: "oklch(0.68 0.28 330)",
                    }}
                  >
                    █
                  </span>
                )}
              </p>
            </div>

            {/* LINE 4: DIRECT ANSWER: 100% SURESHOT */}
            <div style={{ minHeight: "3rem" }}>
              {line3.done && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="inline-block px-6 py-2 rounded-sm"
                  style={{
                    background: "oklch(0.1 0.02 142 / 0.7)",
                    border: "1px solid oklch(0.82 0.22 142 / 0.6)",
                    boxShadow:
                      "0 0 20px oklch(0.82 0.22 142 / 0.25), inset 0 0 10px oklch(0.82 0.22 142 / 0.05)",
                  }}
                >
                  <span
                    className="text-base sm:text-lg font-bold tracking-widest"
                    style={{
                      color: "oklch(0.88 0.22 80)",
                      fontFamily: '"Geist Mono", monospace',
                      letterSpacing: "0.15em",
                      textShadow:
                        "0 0 10px oklch(0.88 0.22 80 / 0.8), 0 0 25px oklch(0.88 0.22 80 / 0.5)",
                    }}
                  >
                    🎯 {line4.displayed}
                    {!line4.done && (
                      <span
                        style={{
                          animation: "urgentFlash 0.6s step-end infinite",
                          color: "oklch(0.88 0.22 80)",
                        }}
                      >
                        █
                      </span>
                    )}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Progress / loading bar at bottom */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12"
            >
              <div
                className="mx-auto rounded-full overflow-hidden"
                style={{
                  width: 200,
                  height: 3,
                  background: "oklch(0.15 0.02 240)",
                }}
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.3, ease: "linear" }}
                  className="h-full rounded-full"
                  style={{
                    background: "oklch(0.82 0.22 142)",
                    boxShadow: "0 0 8px oklch(0.82 0.22 142 / 0.8)",
                  }}
                />
              </div>
              <p
                className="text-xs mt-2 tracking-[0.3em]"
                style={{
                  color: "oklch(0.38 0.05 200)",
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                LOADING VIP DASHBOARD...
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
