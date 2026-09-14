import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "./api";

interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: "admin" | "superadmin" | "doctor" | "nurse" | "auditor";
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("medevidence_user");
    return stored ? JSON.parse(stored) : null;
  });

  const isAuthenticated = !!user && !!localStorage.getItem("medevidence_token");

  useEffect(() => {
    api.onUnauthorized(() => {
      setUser(null);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.login(username, password);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
