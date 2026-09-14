import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDate, getInitials } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Plus, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import type { PatientWithCases } from "@/lib/types";

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientWithCases | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);

  const fetchPatient = async () => {
    try { const data = await api.get<PatientWithCases>(`/patients/${id}`); setPatient(data); } catch (err: any) { toast.error(err.message); }
  };

  useEffect(() => { setLoading(true); fetchPatient().finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>;
  if (!patient) return null;

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/patients" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-3.5 w-3.5" /> Back to Patients</Link>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12"><AvatarFallback className="bg-gradient-to-br from-teal-400 to-cyan-600 text-lg text-white">{getInitials(patient.first_name, patient.last_name)}</AvatarFallback></Avatar>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{patient.first_name} {patient.last_name}</h1>
              <p className="text-sm text-muted-foreground">MRN: {patient.mrn} · DOB: {patient.dob} · {patient.sex || "N/A"}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Edit className="h-4 w-4" /> Edit</Button>
          <Button onClick={() => setCaseOpen(true)}><Plus className="h-4 w-4" /> New Case</Button>
        </div>
      </div>

      <Card className="animate-fade-up animate-fade-up-1">
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-base"><FolderOpen className="h-4 w-4 text-muted-foreground" />Cases ({patient.case_count})</CardTitle></CardHeader>
        <CardContent>
          {patient.cases.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No cases. Click "New Case" to run AI triage.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"><th className="pb-3 pr-4">Case #</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">Created</th><th className="pb-3" /></tr></thead>
                <tbody>{patient.cases.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 transition-colors hover:bg-primary/5">
                    <td className="py-3 pr-4 font-semibold">{c.case_number}</td>
                    <td className="py-3 pr-4"><Badge variant={c.status as any} className="gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${c.status === "open" ? "bg-blue-400" : c.status === "escalated" ? "animate-float-pulse bg-amber-400" : c.status === "resolved" ? "bg-emerald-400" : "bg-muted-foreground"}`} />{c.status}</Badge></td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{formatDate(c.created_at)}</td>
                    <td className="py-3"><Button asChild variant="ghost" size="sm"><Link to={`/cases/${c.id}`}>View</Link></Button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={editOpen} onOpenChange={setEditOpen}><SheetContent side="right"><EditPatientForm patient={patient} onSaved={fetchPatient} onClose={() => setEditOpen(false)} /></SheetContent></Sheet>
      <Sheet open={caseOpen} onOpenChange={setCaseOpen}><SheetContent side="right"><NewCaseForm patient={patient} onClose={() => setCaseOpen(false)} /></SheetContent></Sheet>
    </div>
  );
}

function EditPatientForm({ patient, onSaved, onClose }: { patient: PatientWithCases; onSaved: () => void; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ first_name: patient.first_name, last_name: patient.last_name, dob: patient.dob, sex: patient.sex || "" });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await api.put(`/patients/${patient.id}`, form); toast.success("Patient updated"); onClose(); onSaved(); } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };
  return (
    <>
      <SheetHeader><SheetTitle>Edit Patient</SheetTitle><SheetDescription>Update patient information.</SheetDescription></SheetHeader>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>First Name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Last Name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Sex</Label><Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
        </div>
        <SheetFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button></SheetFooter>
      </form>
    </>
  );
}

function NewCaseForm({ patient, onClose }: { patient: PatientWithCases; onClose: () => void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ heartRate: "130", respRate: "26", temp: "39.1", systolicBP: "85" });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const result = await api.post<{ case: { id: string; case_number: string }; recommendation: { score: number } }>("/cases", { patient_id: patient.id, vitals: { heartRate: Number(form.heartRate), respRate: Number(form.respRate), temp: Number(form.temp), systolicBP: Number(form.systolicBP) } });
      toast.success(`Case ${result.case.case_number} created — Score: ${result.recommendation.score}`);
      onClose(); navigate(`/cases/${result.case.id}`);
    } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };
  return (
    <>
      <SheetHeader><SheetTitle>New Triage Case</SheetTitle><SheetDescription>Patient: {patient.first_name} {patient.last_name} ({patient.mrn})</SheetDescription></SheetHeader>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Heart Rate (bpm)</Label><Input type="number" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} min={0} max={400} required /></div>
          <div className="space-y-2"><Label>Resp Rate (brpm)</Label><Input type="number" value={form.respRate} onChange={(e) => setForm({ ...form, respRate: e.target.value })} min={0} max={100} required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Temperature (°C)</Label><Input type="number" step="0.1" value={form.temp} onChange={(e) => setForm({ ...form, temp: e.target.value })} min={30} max={45} required /></div>
          <div className="space-y-2"><Label>Systolic BP (mmHg)</Label><Input type="number" value={form.systolicBP} onChange={(e) => setForm({ ...form, systolicBP: e.target.value })} min={0} max={300} required /></div>
        </div>
        <SheetFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Running..." : "Run Triage"}</Button></SheetFooter>
      </form>
    </>
  );
}
