import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";
import type { AuditLog } from "@/lib/types";

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ logs: AuditLog[]; total: number }>("/audit")
      .then((data) => { setLogs(data.logs); setTotal(data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-[500px] rounded-2xl" />
      </div>
    );
  }

  function getActionVariant(action: string) {
    if (action.includes("tamper")) return "escalated";
    if (action.includes("fail")) return "fail";
    if (action.includes("create")) return "pass";
    if (action.includes("delete")) return "fail";
    if (action.includes("update") || action.includes("status")) return "open";
    if (action.includes("login")) return action.includes("success") ? "pass" : "fail";
    return "open";
  }

  function getDotColor(action: string) {
    if (action.includes("tamper")) return "bg-red-400 ring-red-500/20";
    if (action.includes("fail")) return "bg-red-400 ring-red-500/20";
    if (action.includes("create")) return "bg-emerald-400 ring-emerald-500/20";
    if (action.includes("delete")) return "bg-red-400 ring-red-500/20";
    return "bg-teal-400 ring-teal-500/20";
  }

  function formatDetails(details: string | null) {
    if (!details || details === "null") return null;
    try {
      const obj = typeof details === "string" ? JSON.parse(details) : details;
      return Object.entries(obj).map(([k, v]) => ({ key: k, value: typeof v === "object" ? JSON.stringify(v) : String(v) }));
    } catch {
      return [{ key: "raw", value: details }];
    }
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">{total} total entries</p>
      </div>

      <Card className="animate-fade-up animate-fade-up-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No audit entries</div>
          ) : (
            <div className="relative">
              <div className="absolute bottom-2 left-[5px] top-2 w-px bg-gradient-to-b from-primary/40 via-border to-border" />
              <div className="space-y-0">
                {logs.map((a, i) => {
                  const d = new Date(a.created_at + (a.created_at.endsWith("Z") ? "" : "Z"));
                  const details = formatDetails(a.details);
                  return (
                    <div key={a.id} className="animate-fade-up group relative flex gap-4 py-3 pl-6" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                      <span className={`absolute left-0 top-4 h-2.5 w-2.5 rounded-full ring-4 transition-transform group-hover:scale-125 ${getDotColor(a.action)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getActionVariant(a.action) as any}>{a.action}</Badge>
                          <span className="text-sm font-semibold">{a.username || "system"}</span>
                          {a.entity_id && (
                            <span className="text-xs text-muted-foreground">
                              {a.entity_type} <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">{a.entity_id.substring(0, 8)}</code>
                            </span>
                          )}
                          {a.ip_address && <span className="font-mono text-[10px] text-muted-foreground">{a.ip_address}</span>}
                        </div>
                        {details && (
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {details.map((d) => (
                              <span key={d.key}><span className="text-foreground/60">{d.key}:</span> {d.value}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-medium tabular-nums">{d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
