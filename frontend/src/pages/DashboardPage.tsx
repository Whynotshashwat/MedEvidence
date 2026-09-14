import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { CountUp } from "@/components/ui/count-up";
import {
  Users,
  FolderOpen,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Shield,
  ArrowRight,
  Clock,
  Command,
} from "lucide-react";
import type { DashboardData } from "@/lib/types";

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const s = data.stats;
  const stats = [
    { label: "Patients", value: s.totalPatients, icon: Users, gradient: "from-teal-400 to-cyan-600" },
    { label: "Total Cases", value: s.totalCases, icon: FolderOpen, gradient: "from-blue-400 to-indigo-600" },
    { label: "Open", value: s.openCases, icon: AlertCircle, gradient: "from-amber-400 to-orange-600" },
    { label: "Escalated", value: s.escalatedCases, icon: ArrowUpRight, gradient: "from-red-400 to-rose-600" },
    { label: "Resolved", value: s.resolvedCases, icon: CheckCircle2, gradient: "from-emerald-400 to-teal-600" },
    { label: "Evidence", value: s.totalEvidence, icon: Shield, gradient: "from-violet-400 to-purple-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="animate-fade-up relative overflow-hidden rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-500/15 via-cyan-500/10 to-violet-500/15 p-8 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[11px] font-medium text-teal-500">
            <span className="h-1.5 w-1.5 animate-float-pulse rounded-full bg-teal-400" />
            Evidence system online
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {greeting}, <span className="text-gradient">{user?.full_name?.split(" ")[0] || "User"}</span>
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Cryptographically proven clinical recommendations with tamper detection — all in one place.
          </p>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            Press
            <kbd className="flex items-center gap-0.5 rounded-md border bg-background/60 px-1.5 py-0.5 font-medium">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
            to search anything
          </div>
        </div>
      </div>

      {/* Stats grid — spotlight cards with count-up */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat, i) => (
          <SpotlightCard
            key={stat.label}
            className={`card-hover animate-fade-up animate-fade-up-${i + 1} rounded-2xl border bg-card/60 p-4 backdrop-blur-sm`}
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <CountUp value={stat.value} className="block text-2xl font-extrabold tabular-nums tracking-tight" />
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Recent cases */}
      <Card className="animate-fade-up animate-fade-up-3">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Cases
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/cases">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentCases.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">No cases yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a patient and run triage to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <th className="pb-3 pr-4">Case #</th>
                    <th className="pb-3 pr-4">Patient</th>
                    <th className="pb-3 pr-4">Score</th>
                    <th className="pb-3 pr-4">Recommendation</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.recentCases.map((c) => (
                    <tr key={c.id} className="group border-b transition-colors last:border-0 hover:bg-primary/5">
                      <td className="py-3 pr-4 font-semibold">{c.case_number}</td>
                      <td className="py-3 pr-4">
                        {c.first_name || "?"} {c.last_name || "?"}
                      </td>
                      <td className="py-3 pr-4">
                        {c.score != null && (
                          <span
                            className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                              c.score > 50 ? "bg-red-500/15 text-red-400" : "bg-teal-500/15 text-teal-400"
                            }`}
                          >
                            {c.score}
                          </span>
                        )}
                        {c.score == null && <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{c.recommend || "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={c.status as any} className="gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.status === "open"
                                ? "bg-blue-400"
                                : c.status === "escalated"
                                  ? "animate-float-pulse bg-amber-400"
                                  : c.status === "resolved"
                                    ? "bg-emerald-400"
                                    : "bg-muted-foreground"
                            }`}
                          />
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button asChild variant="ghost" size="sm" className="opacity-0 transition-opacity group-hover:opacity-100">
                          <Link to={`/cases/${c.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      {data.recentAudit.length > 0 && (
        <Card className="animate-fade-up animate-fade-up-4">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />
              {data.recentAudit.slice(0, 6).map((a) => (
                <div key={a.id} className="relative flex items-center gap-4 py-2 pl-6 text-sm">
                  <span
                    className={`absolute left-0 h-2.5 w-2.5 rounded-full ring-4 ${
                      a.action.includes("tamper") || a.action.includes("fail")
                        ? "bg-red-400 ring-red-500/15"
                        : "bg-teal-400 ring-teal-500/15"
                    }`}
                  />
                  <span className="w-32 shrink-0 text-xs text-muted-foreground">
                    {formatDate(a.created_at)}
                  </span>
                  <Badge
                    variant={
                      a.action.includes("tamper")
                        ? "escalated"
                        : a.action.includes("fail")
                          ? "fail"
                          : "pass"
                    }
                  >
                    {a.action}
                  </Badge>
                  <span className="text-foreground">{a.username || "system"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
