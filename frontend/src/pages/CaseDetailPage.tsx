import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { ScoreGauge } from "@/components/ui/gauge";
import { VitalMonitor } from "@/components/ui/vital-monitor";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { ArrowLeft, Shield, ShieldCheck, ShieldAlert, Zap, RotateCcw, ChevronDown, ChevronUp, FileText, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CaseDetail, VerifyResult } from "@/lib/types";

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [tamperOpen, setTamperOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [glitch, setGlitch] = useState(false);

  const fetchCase = async () => {
    try {
      const data = await api.get<CaseDetail>(`/cases/${id}`);
      setCaseData(data);
      setStatus(data.status);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCase().finally(() => setLoading(false));
  }, [id]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await api.post<VerifyResult>(`/cases/${id}/verify`);
      setVerifyResult(result);
      if (!result.ok) {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 600);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleTamper = async () => {
    try {
      await api.post(`/cases/${id}/tamper`);
      toast.error("Record tampered — run Verify to detect");
      setTamperOpen(false);
      setVerifyResult(null);
      fetchCase();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRevert = async () => {
    try {
      await api.post(`/cases/${id}/revert`);
      toast.success("Data reverted to original values");
      setRevertOpen(false);
      setVerifyResult(null);
      fetchCase();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/cases/${id}/status`, { status: newStatus });
      setStatus(newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!caseData) return null;

  const c = caseData;
  const latestVitals = c.vitals[0];
  const latestRec = c.recommendations[0];

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/cases" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Cases
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{c.case_number}</h1>
          <p className="text-sm text-muted-foreground">
            {c.first_name || "?"} {c.last_name || "?"} ({c.mrn || "?"}) ·{" "}
            <Badge variant={status as any} className="gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", status === "open" ? "bg-blue-400" : status === "escalated" ? "animate-float-pulse bg-amber-400" : status === "resolved" ? "bg-emerald-400" : "bg-muted-foreground")} />
              {status}
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="success" onClick={handleVerify} disabled={verifying}>
            <ShieldCheck className="h-4 w-4" />
            {verifying ? "Verifying..." : "Verify"}
          </Button>
          <Button variant="destructive" onClick={() => setTamperOpen(true)}>
            <Zap className="h-4 w-4" /> Tamper
          </Button>
          {c.is_tampered && (
            <Button variant="outline" onClick={() => setRevertOpen(true)} className="border-amber-500 text-amber-500 hover:bg-amber-500/10">
              <RotateCcw className="h-4 w-4" /> Revert
            </Button>
          )}
          <select value={status} onChange={(e) => handleStatusChange(e.target.value)} className="h-9 rounded-xl border bg-card/60 px-3 text-sm backdrop-blur-sm">
            {["open", "escalated", "resolved", "closed"].map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
      </div>

      {verifyResult && <VerifyResultBanner result={verifyResult} glitch={glitch} />}

      <div className="animate-fade-up-1 grid gap-4 md:grid-cols-2">
        {latestRec && (
          <SpotlightCard className="gradient-border rounded-2xl p-6">
            <div className="flex items-start gap-6">
              <ScoreGauge score={latestRec.score} />
              <div className="flex-1">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">AI Recommendation</div>
                <Badge variant={latestRec.score > 50 ? "fail" : "pass"} className="mb-3">{latestRec.recommend}</Badge>
                <p className="text-xs text-muted-foreground">
                  Model: {latestRec.model_version}<br />{formatDate(latestRec.created_at)}
                </p>
              </div>
            </div>
          </SpotlightCard>
        )}
      </div>

      {latestVitals && (
        <div className="animate-fade-up-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <VitalMonitor label="Heart Rate" value={latestVitals.heart_rate} unit="bpm" color="red" />
          <VitalMonitor label="Resp Rate" value={latestVitals.resp_rate} unit="brpm" color="blue" />
          <VitalMonitor label="Temperature" value={latestVitals.temp} unit="°C" color="orange" />
          <VitalMonitor label="Systolic BP" value={latestVitals.systolic_bp} unit="mmHg" color="purple" />
        </div>
      )}

      <Card className="animate-fade-up-3">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Evidence Records ({c.evidence.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {c.evidence.length === 0 ? (
            <div className="py-8 text-center"><FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No evidence records</p></div>
          ) : (
            <div className="space-y-3">
              {c.evidence.map((ev) => (
                <EvidenceItem key={ev.id} ev={ev} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {c.vitals.length > 1 && (
        <Card className="animate-fade-up-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Vitals History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="pb-3 pr-4">Time</th><th className="pb-3 pr-4">HR</th><th className="pb-3 pr-4">RR</th><th className="pb-3 pr-4">Temp</th><th className="pb-3">BP</th>
                </tr></thead>
                <tbody>
                  {c.vitals.map((v) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">{formatDate(v.recorded_at)}</td>
                      <td className="py-2.5 pr-4">{v.heart_rate}</td>
                      <td className="py-2.5 pr-4">{v.resp_rate}</td>
                      <td className="py-2.5 pr-4">{v.temp}</td>
                      <td className="py-2.5">{v.systolic_bp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Sheet open={tamperOpen} onOpenChange={setTamperOpen}>
        <SheetContent side="right">
          <SheetHeader><SheetTitle>Simulate Tampering</SheetTitle><SheetDescription>This will mutate stored vitals and recommendation to simulate tampering.</SheetDescription></SheetHeader>
          <SheetFooter><Button variant="ghost" onClick={() => setTamperOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleTamper}>Tamper Record</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={revertOpen} onOpenChange={setRevertOpen}>
        <SheetContent side="right">
          <SheetHeader><SheetTitle>Revert Tampered Data</SheetTitle><SheetDescription>This will restore the original values before tampering.</SheetDescription></SheetHeader>
          <SheetFooter><Button variant="ghost" onClick={() => setRevertOpen(false)}>Cancel</Button><Button onClick={handleRevert}>Revert Data</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function VerifyResultBanner({ result, glitch }: { result: VerifyResult; glitch: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className={cn(
        "flex items-center gap-3 rounded-2xl border-2 p-4 font-semibold backdrop-blur-sm animate-fade-up",
        result.ok
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/50 bg-red-500/10 text-red-400",
        glitch && "animate-glitch"
      )}>
        {result.ok ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <ShieldAlert className="h-5 w-5 shrink-0" />}
        <div>
          {result.ok ? "VERIFIED — Evidence is intact and untampered" : "TAMPERED — Verification failed"}
          {!result.ok && result.reasons && <div className="mt-1 text-sm font-normal opacity-80">{result.reasons.join("; ")}</div>}
        </div>
        {!result.ok && <span className="ml-auto h-3 w-3 animate-float-pulse rounded-full bg-red-400" />}
      </div>

      {result.checks && (
        <Card>
          <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen(!open)}>
            <span className="flex items-center gap-2 text-sm font-semibold">Verification Details</span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {open && (
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(result.checks).map(([name, check]) => (
                      <tr key={name} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-semibold capitalize">{name}</td>
                        <td className="py-2.5 pr-4"><Badge variant={check.status === "pass" ? "pass" : "fail"}>{check.status}</Badge></td>
                        <td className="py-2.5 text-xs text-muted-foreground">{check.detail || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.subject && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Record: {result.subject.record_id || "—"}</span>
                  <span>Key: {result.subject.key_id || "—"}</span>
                  <span>Issued: {formatDate(result.subject.issued_at)}</span>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {result.receipt && <TerminalReceipt receipt={result.receipt} />}
    </div>
  );
}

function TerminalReceipt({ receipt }: { receipt: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rec = receipt.record || {};
  const sig = rec.signature || {};
  const commits = rec.event?.commitments || {};

  const fullJson = JSON.stringify(receipt, null, 2);
  const copy = () => { navigator.clipboard.writeText(fullJson); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Card className="overflow-hidden">
      <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen(!open)}>
        <span className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-muted-foreground" />Coded Receipt</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="relative border-t bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
          <button onClick={copy} className="absolute right-3 top-3 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] transition-colors hover:bg-white/10">
            {copied ? <><Check className="mr-1 inline h-3 w-3" />Copied</> : <><Copy className="mr-1 inline h-3 w-3" />Copy</>}
          </button>
          <div className="overflow-x-auto pr-20">
            <ReceiptLine label="schema" value={receipt.schema} />
            <ReceiptLine label="record_id" value={rec.record_id} />
            <ReceiptLine label="event.type" value={rec.event?.type} />
            <ReceiptLine label="event.execution_id" value={rec.event?.execution_id} />
            <ReceiptLine label="event.software" value={rec.event?.software?.name} />
            <ReceiptLine label="event.version" value={rec.event?.software?.version} />
            <ReceiptLine label="time.issued_at" value={rec.time?.issued_at} />
            <ReceiptLine label="commitments.input" value={commits.input?.slice(0, 64) + "..."} mono />
            <ReceiptLine label="commitments.output" value={commits.output?.slice(0, 64) + "..."} mono />
            <ReceiptLine label="sig.algorithm" value={sig.alg} />
            <ReceiptLine label="sig.key_id" value={sig.key_id} mono />
            <ReceiptLine label="sig.ml_dsa" value={sig.ml_dsa?.slice(0, 56) + "..."} mono />
            <ReceiptLine label="binding_hash" value={receipt.binding_hash?.slice(0, 56) + "..."} mono />
          </div>
        </div>
      )}
    </Card>
  );
}

function ReceiptLine({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-40 text-emerald-400/80">{label}:</span>
      <span className={cn("break-all", mono && "text-cyan-400/70")}>{value || "—"}</span>
    </div>
  );
}

function EvidenceItem({ ev }: { ev: { id: string; record_id: string; execution_id: string; binding_hash: string; created_at: string } }) {
  const [copied, setCopied] = useState(false);
  const copyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ev.binding_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <SpotlightCard className="group rounded-xl border bg-card/60 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">CooL Evidence Receipt</span>
        <span className="ml-auto text-xs text-muted-foreground">{formatDate(ev.created_at)}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Record: <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">{ev.record_id.substring(0, 12)}...</code></span>
        <span>Exec: <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">{ev.execution_id.substring(0, 12)}...</code></span>
        <span className="flex items-center gap-1">
          Hash: <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">{ev.binding_hash.substring(0, 16)}...</code>
          <button onClick={copyHash} className="ml-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </span>
      </div>
    </SpotlightCard>
  );
}
