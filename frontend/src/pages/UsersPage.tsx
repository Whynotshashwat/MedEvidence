import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDate, generatePassword } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/lib/types";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [newOpen, setNewOpen] = useState(false);

  const fetchUsers = useCallback(async (q?: string) => {
    try { const path = q ? `/auth/users?search=${encodeURIComponent(q)}` : "/auth/users"; const data = await api.get<User[]>(path); console.log("Users API response:", data); setUsers(Array.isArray(data) ? data : []); } catch (err) { console.error("Failed to fetch users:", err); }
  }, []);

  useEffect(() => { setLoading(true); const q = searchParams.get("search"); if (q) setSearchQuery(q); fetchUsers(q || undefined).finally(() => setLoading(false)); }, [searchParams, fetchUsers]);

  const handleSearch = (val: string) => { setSearchQuery(val); if (val.trim()) setSearchParams({ search: val.trim() }); else setSearchParams({}); };
  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    try { await api.del(`/auth/users/${id}`); toast.success("User deleted"); fetchUsers(searchQuery || undefined); } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-extrabold tracking-tight">User Management</h1><p className="text-sm text-muted-foreground">{users.length} registered users</p></div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by username or name..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-10 w-60" /></div>
          <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New User</Button>
        </div>
      </div>

      <Card className="animate-fade-up animate-fade-up-1">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Username</th><th className="px-4 py-3">Full Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Created</th><th className="px-4 py-3" />
              </tr></thead>
              <tbody>
                {users.length === 0 ? (<tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No users found</td></tr>) : users.map((u) => {
                  const initials = ((u.full_name || "?")[0] + ((u.full_name || "?").split(" ").pop() || "?")[0]).toUpperCase();
                  return (
                    <tr key={u.id} className="group border-b last:border-0 transition-colors hover:bg-primary/5">
                      <td className="px-4 py-3 font-semibold">{u.username}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{initials}</AvatarFallback></Avatar>{u.full_name}</div></td>
                      <td className="px-4 py-3"><Badge variant={u.role as any}>{u.role}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3"><Button variant="ghost" size="sm" className="text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive" onClick={() => handleDelete(u.id, u.username)}>Delete</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={newOpen} onOpenChange={setNewOpen}><SheetContent side="right"><NewUserForm onCreated={() => fetchUsers(searchQuery || undefined)} onClose={() => setNewOpen(false)} /></SheetContent></Sheet>
    </div>
  );
}

function NewUserForm({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState(generatePassword());
  const [created, setCreated] = useState<{ user: User; password: string } | null>(null);
  const [form, setForm] = useState({ username: "", full_name: "", role: "doctor" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { const res = await api.post<{ user: User; password: string }>("/auth/users", { ...form, password }); setCreated(res); toast.success("User created"); onCreated(); } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
  };

  if (created) {
    return (
      <>
        <SheetHeader><SheetTitle>User Created</SheetTitle></SheetHeader>
        <div className="space-y-2 rounded-xl border p-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Username</span><span className="font-semibold">{created.user.username}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Full Name</span><span className="font-semibold">{created.user.full_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-semibold">{created.user.role}</span></div>
          <div className="flex justify-between border-t pt-2 mt-2"><span className="text-muted-foreground">Password</span><code className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono font-bold text-primary">{created.password}</code></div>
        </div>
        <p className="text-xs text-destructive text-center">Copy this password now — it won't be shown again.</p>
        <SheetFooter><Button onClick={onClose}>Done</Button></SheetFooter>
      </>
    );
  }

  return (
    <>
      <SheetHeader><SheetTitle>New User</SheetTitle><SheetDescription>Create a new user account.</SheetDescription></SheetHeader>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="jane.doe" required /></div>
          <div className="space-y-2"><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Role</Label><Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="doctor">Doctor</SelectItem><SelectItem value="nurse">Nurse</SelectItem><SelectItem value="auditor">Auditor</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Password</Label><div className="flex gap-2"><Input value={password} onChange={(e) => setPassword(e.target.value)} required /><Button type="button" variant="outline" size="icon" onClick={() => setPassword(generatePassword())} title="Regenerate"><RefreshCw className="h-4 w-4" /></Button></div></div>
        </div>
        <p className="text-xs text-muted-foreground">Auto-generated password — copy it before saving.</p>
        <SheetFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create User"}</Button></SheetFooter>
      </form>
    </>
  );
}
