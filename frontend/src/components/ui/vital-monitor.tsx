import { cn } from "@/lib/utils";

export function VitalMonitor({
  label,
  value,
  unit,
  color,
  className,
}: {
  label: string;
  value: string | number;
  unit: string;
  color: "red" | "blue" | "orange" | "purple";
  className?: string;
}) {
  const colors = {
    red: { line: "hsl(0 85% 60%)", glow: "hsl(0 85% 60% / 0.25)" },
    blue: { line: "hsl(210 95% 60%)", glow: "hsl(210 95% 60% / 0.25)" },
    orange: { line: "hsl(28 95% 55%)", glow: "hsl(28 95% 55% / 0.25)" },
    purple: { line: "hsl(258 90% 65%)", glow: "hsl(258 90% 65% / 0.25)" },
  }[color];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/60 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5",
        className
      )}
    >
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-40 blur-2xl"
        style={{ background: colors.glow }}
      />
      <div className="relative">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-extrabold tabular-nums">{value}</span>
          <span className="text-xs font-medium text-muted-foreground">{unit}</span>
        </div>
        <svg viewBox="0 0 100 24" className="mt-2 h-6 w-full" fill="none">
          <path
            d="M0 12 L20 12 L26 4 L32 20 L38 12 L58 12 L64 6 L70 18 L76 12 L100 12"
            stroke={colors.line}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ecg-line"
          />
        </svg>
      </div>
    </div>
  );
}
