import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../services/api";
import type { User } from "../types";

type Auth = { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<User>; logout: () => void; setSession: (token: string, user: User) => void };
const C = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!sessionStorage.getItem("sv_token")) { setLoading(false); return; }
    api.get("/auth/me").then(r => setUser(r.data.user)).catch(() => sessionStorage.removeItem("sv_token")).finally(() => setLoading(false));
  }, []);
  const setSession = (token: string, nextUser: User) => { sessionStorage.setItem("sv_token", token); setUser(nextUser); };
  const login = async (email: string, password: string) => { const { data } = await api.post("/auth/login", { email, password }); setSession(data.token, data.user); return data.user; };
  const logout = () => { sessionStorage.removeItem("sv_token"); setUser(null); };
  return <C.Provider value={{ user, loading, login, logout, setSession }}>{children}</C.Provider>;
}
export const useAuth = () => { const value = useContext(C); if (!value) throw Error("AuthProvider missing"); return value; };
