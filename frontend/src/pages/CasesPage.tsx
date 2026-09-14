import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import type { CaseListItem } from "@/lib/types";

export function CasesPage() {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  const fetchCases = useCallback(async (q?: string) => {
    try {
      const path = q ? `/cases?search=${encodeURIComponent(q)}` : "/cases";
      const data = await api.get<{ cases: CaseListItem[]; total: number }>(path);
      setCases(data.cases);
      setTotal(data.total);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = searchParams.get("search");
    if (q) setSearchQuery(q);
    fetchCases(q || undefined).finally(() => setLoading(false));
  }, [searchParams, fetchCases]);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      setSearchParams({ search: val.trim() });
    } else {
      setSearchParams({});
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">All Cases</h1>
          <p className="text-sm text-muted-foreground">{total} total cases</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by case #, patient, MRN..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 w-72"
            />
          </div>
          <Button asChild>
            <Link to="/patients">
              <Plus className="h-4 w-4" /> New Case
            </Link>
          </Button>
        </div>
      </div>

      <Card className="animate-fade-up animate-fade-up-1">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Case #</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">MRN</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Recommendation</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No cases found
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c.id} className="group border-b last:border-0 transition-colors hover:bg-primary/5">
                      <td className="px-4 py-3 font-semibold">{c.case_number}</td>
                      <td className="px-4 py-3">
                        {c.first_name || "?"} {c.last_name || "?"}
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                          {c.mrn || "—"}
                        </code>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{c.score ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.recommend || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status as any}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/cases/${c.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
