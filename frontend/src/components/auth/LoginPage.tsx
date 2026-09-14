import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  Lock,
  Bot,
  ClipboardCheck,
  Moon,
  Sun,
  ArrowRight,
  User,
} from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden flex-1 items-center justify-center bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 p-12 lg:flex">
        {/* Decorative shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-24 h-[500px] w-[500px] rounded-full bg-white/[0.04]" />
          <div className="absolute -bottom-40 -left-24 h-[400px] w-[400px] rounded-full bg-white/[0.03]" />
          <div className="absolute top-1/2 left-1/3 h-[200px] w-[200px] rounded-full bg-white/[0.02]" />
        </div>

        <div className="relative z-10 max-w-md">
          <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-4xl font-extrabold text-white tracking-tight">MedEvidence</h1>
          <p className="mb-12 text-lg text-white/70">Cryptographic AI Clinical Evidence System</p>

          <div className="flex flex-col gap-3">
            {[
              { icon: Lock, title: "Tamper-Proof Evidence", desc: "CooL SDK cryptographic receipts" },
              { icon: Bot, title: "AI-Powered Triage", desc: "Automated clinical scoring" },
              { icon: ClipboardCheck, title: "Full Audit Trail", desc: "Compliance-ready logging" },
            ].map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm transition-colors hover:bg-white/[0.1]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 shrink-0">
                  <f.icon className="h-5 w-5 text-white/80" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{f.title}</div>
                  <div className="text-xs text-white/60">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-[480px] lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 lg:right-8 lg:top-8"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <User className="h-5 w-5 text-primary" />
          </div>

          <h2 className="mb-1 text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mb-8 text-sm text-muted-foreground">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-10"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Demo: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">admin</code> /{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
