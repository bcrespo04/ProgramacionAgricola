import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Usuario } from "../types";

interface AuthCtx {
  usuario: Usuario | null;
  cargando: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarPerfil(email: string) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("activo", true)
      .single();
    if (error || !data) return null;
    return data as Usuario;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email) {
        const perfil = await cargarPerfil(session.user.email);
        setUsuario(perfil);
      }
      setCargando(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        const perfil = await cargarPerfil(session.user.email);
        setUsuario(perfil);
      } else {
        setUsuario(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string): Promise<boolean> {
    setError(null);
    setCargando(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return false;
    }
    const perfil = await cargarPerfil(email);
    if (!perfil) {
      setError("Usuario no encontrado o inactivo. Contacta al administrador.");
      await supabase.auth.signOut();
      setCargando(false);
      return false;
    }
    setUsuario(perfil);
    setCargando(false);
    return true;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUsuario(null);
  }

  return <Ctx.Provider value={{ usuario, cargando, error, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
