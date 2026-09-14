const BASE = "/api";

let token: string | null = localStorage.getItem("medevidence_token");
let currentUser: any = JSON.parse(localStorage.getItem("medevidence_user") || "null");
let onUnauthorized: (() => void) | null = null;

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = { error: `HTTP ${res.status}: ${res.statusText}` };
  }

  if (res.status === 401) {
    logout();
    if (onUnauthorized) onUnauthorized();
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("medevidence_token");
  localStorage.removeItem("medevidence_user");
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: any) => request<T>("POST", path, body),
  put: <T>(path: string, body?: any) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: any) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),

  async login(username: string, password: string) {
    const data = await request<{ token: string; user: any }>("POST", "/auth/login", {
      username,
      password,
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem("medevidence_token", token);
    localStorage.setItem("medevidence_user", JSON.stringify(currentUser));
    return data;
  },

  logout,
  getToken: () => token,
  getUser: () => currentUser,
  isLoggedIn: () => !!token && !!currentUser,
  onUnauthorized: (fn: () => void) => {
    onUnauthorized = fn;
  },
};
