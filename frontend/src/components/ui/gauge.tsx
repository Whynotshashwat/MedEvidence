import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ScoreGauge({
  score,
  size = 140,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const danger = score > 50;
  const offset = circumference * (1 - (progress / 100) * (score / 100));

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1000, 1);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1000, 1);
      setDisplayScore(Math.round(score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const gradientId = `gauge-grad-${danger ? "danger" : "safe"}`;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {danger ? (
              <>
                <stop offset="0%" stopColor="hsl(35 95% 55%)" />
                <stop offset="100%" stopColor="hsl(0 85% 58%)" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="hsl(172 85% 52%)" />
                <stop offset="100%" stopColor="hsl(200 95% 55%)" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-3xl font-extrabold tabular-nums",
            danger ? "text-red-400" : "text-teal-400"
          )}
        >
          {displayScore}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Risk Score
        </span>
      </div>
    </div>
  );
}
