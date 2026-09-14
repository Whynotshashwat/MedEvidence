import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Patient } from "@/lib/types";

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(search.get("search") || "");
  const [newOpen, setNewOpen] = useState(false);

  const fetchPatients = useCallback(async (q?: string) => {
    try {
      const path = q ? `/patients?search=${encodeURIComponent(q)}` : "/patients";
      const data = await api.get<{ patients: Patient[]; total: number }>(path);
      setPatients(data.patients);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = search.get("search");
    if (q) setSearchQuery(q);
    fetchPatients(q || undefined).finally(() => setLoading(false));
  }, [search, fetchPatients]);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) setSearch({ search: val.trim() });
    else setSearch({});
  };

  const handleDelete = async (id: string, mrn: string) => {
    if (!confirm(`Delete patient ${mrn}?`)) return;
    try { await api.del(`/patients/${id}`); toast.success("Patient deleted"); fetchPatients(searchQuery || undefined); } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Patients</h1><p className="text-sm text-muted-foreground">{total} total patients</p></div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by name or MRN..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-10 w-60" /></div>
          <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New Patient</Button>
        </div>
      </div>

      <Card className="animate-fade-up animate-fade-up-1">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">MRN</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">DOB</th><th className="px-4 py-3">Sex</th><th className="px-4 py-3">Created</th><th className="px-4 py-3" />
              </tr></thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No patients found</td></tr>
                ) : patients.map((p) => (
                  <tr key={p.id} className="group border-b last:border-0 transition-colors hover:bg-primary/5">
                    <td className="px-4 py-3"><code className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono">{p.mrn}</code></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{(p.first_name || "?")[0]}{(p.last_name || "?")[0]}</AvatarFallback></Avatar><span className="font-medium">{p.first_name} {p.last_name}</span></div></td>
                    <td className="px-4 py-3 text-muted-foreground">{p.dob}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.sex || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link to={`/patients/${p.id}`}>View</Link></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive" onClick={() => handleDelete(p.id, p.mrn)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent side="right"><NewPatientForm onCreated={() => fetchPatients(searchQuery || undefined)} onClose={() => setNewOpen(false)} /></SheetContent>
      </Sheet>
    </div>
  );
}

function NewPatientForm({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ mrn: "", first_name: "", last_name: "", dob: "", sex: "" });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await api.post("/patients", form); toast.success("Patient created"); onClose(); setForm({ mrn: "", first_name: "", last_name: "", dob: "", sex: "" }); onCreated(); } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };
  return (
    <>
      <SheetHeader><SheetTitle>New Patient</SheetTitle><SheetDescription>Add a new patient to the system.</SheetDescription></SheetHeader>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>MRN</Label><Input value={form.mrn} onChange={(e) => setForm({ ...form, mrn: e.target.value })} placeholder="MRN-00123" required /></div>
          <div className="space-y-2"><Label>Sex</Label><Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>First Name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="John" required /></div>
          <div className="space-y-2"><Label>Last Name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Doe" required /></div>
        </div>
        <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required /></div>
        <SheetFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Patient"}</Button></SheetFooter>
      </form>
    </>
  );
}
