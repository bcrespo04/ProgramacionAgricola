import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { usuario, login, error, cargando } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    await login(email, password);
    setEnviando(false);
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      <div className="bg-[#1A4D2E] px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center mb-3">
          <Sprout className="h-7 w-7 text-white" />
        </div>
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-emerald-300">
          Oleocaribe S.A.
        </span>
        <h1 className="text-white text-2xl font-black mt-1">Programación Agrícola</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-8 flex flex-col gap-4 max-w-md mx-auto w-full">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-stone-600 uppercase tracking-wide">Correo</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="nombre@correo.com"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-[16px] font-medium text-stone-900 outline-none focus:border-[#1A4D2E] focus:ring-4 focus:ring-[#1A4D2E]/10" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-stone-600 uppercase tracking-wide">Contraseña</span>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-[16px] font-medium text-stone-900 outline-none focus:border-[#1A4D2E] focus:ring-4 focus:ring-[#1A4D2E]/10" />
        </label>

        {error && (
          <p className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button type="submit" disabled={enviando || cargando}
          className="mt-2 w-full rounded-2xl bg-[#1A4D2E] py-4 text-white font-black text-[16px] shadow-lg shadow-[#1A4D2E]/20 active:scale-[0.98] transition disabled:opacity-60">
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
