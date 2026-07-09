import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sprout, Plus, ChevronRight, Clock, AlertCircle,
  LogOut, Users, Eye, RefreshCw
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { getRegistros } from "../lib/api";
import { forzarActualizacion } from "../lib/forzarActualizacion";
import { EstadoBadge, Spinner } from "../components/ui";
import { TabBar } from "../components/layout/TabBar";
import type { RegistroPlanificacion, EstadoRegistro } from "../types";

const fmt2 = (v: number) => v.toFixed(2);

function TarjetaRegistro({ r, onClick }: { r: RegistroPlanificacion; onClick: () => void }) {
  const anios = Array.from(new Set((r.grupos_siembra ?? []).map(g => g.anio_siembra))).sort();
  const totalLotes =
    (r.grupos_siembra ?? []).reduce((a, g) => a + (g.lotes_cosecha?.length ?? 0), 0) +
    (r.grupos_coyoleo ?? []).reduce((a, g) => a + (g.lotes_coyoleo?.length ?? 0), 0);

  return (
    <button onClick={onClick}
      className="w-full rounded-2xl bg-white border border-stone-200 px-4 py-3.5 text-left active:scale-[0.98] transition shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-6 w-6 rounded-lg bg-[#1A4D2E] flex items-center justify-center text-[9px] font-black text-white shrink-0">
              S{r.sector}
            </span>
            <span className="text-[15px] font-black text-stone-900">Sector {r.sector}</span>
            <span className="text-[12px] text-stone-400">
              {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-NI", { day: "2-digit", month: "short" })}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <EstadoBadge estado={r.estado} />
            {r.estado === "rechazado" && (
              <span className="text-[10px] text-red-500 font-medium">Ver comentario</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
            {r.coordinador && (
              <span>Coord <b className="text-stone-700">{r.coordinador.nombre.split(" ")[0]}</b></span>
            )}
            {anios.length > 0 && (
              <span>Siembra <b className="text-stone-700">{anios.join(", ")}</b></span>
            )}
            <span>Lotes <b className="text-stone-700">{totalLotes}</b></span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-stone-300 shrink-0 mt-1" />
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<RegistroPlanificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalActualizar, setModalActualizar] = useState(false);
  const [actualizando, setActualizando] = useState(false);

  async function handleActualizar() {
    setActualizando(true);
    try {
      await forzarActualizacion();
    } catch (e) {
      console.error(e);
      setActualizando(false);
    }
  }

  useEffect(() => {
    if (!usuario) return;
    getRegistros()
      .then(setRegistros)
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [usuario]);

  if (!usuario) return null;

  const esCoord   = usuario.rol === "coordinador";
  const esZona    = usuario.rol === "zona_sur" || usuario.rol === "zona_norte";
  const esMonitor = usuario.rol === "monitor";

  const pendientes = registros.filter(r => r.estado === "pendiente");
  const rechazados = registros.filter(r => r.estado === "rechazado");

  const etiquetaRol: Record<string, string> = {
    coordinador: `Coordinador · Sector ${usuario.sector}`,
    zona_sur:    "Zona Sur · Sectores 1–6",
    zona_norte:  "Zona Norte · Sectores 7–12",
    monitor:     "Monitor · Solo lectura",
    admin:       "Administrador",
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Header */}
      <div className="bg-[#1A4D2E] px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              Programación Agrícola
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setModalActualizar(true)} className="text-emerald-300 p-1" title="Actualizar aplicación">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={logout} className="text-emerald-300 p-1">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <h1 className="text-white text-2xl font-black">Hola, {usuario.nombre.split(" ")[0]}</h1>
        <p className="text-emerald-400 text-[12px]">{etiquetaRol[usuario.rol]}</p>

        {/* Stats */}
        {!esMonitor && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: "Total",      valor: registros.length, color: "text-white" },
              { label: esZona ? "Por revisar" : "Pendientes", valor: pendientes.length, color: "text-amber-300" },
              { label: "Rechazados", valor: rechazados.length, color: "text-red-300" },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl px-3 py-2.5">
                <div className={`text-[22px] font-black tabular-nums ${s.color}`}>{s.valor}</div>
                <div className="text-[10px] text-emerald-300 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-5 pb-24">
        {/* Alerta coordinador: rechazados */}
        {esCoord && rechazados.length > 0 && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold text-red-700">
                {rechazados.length} registro{rechazados.length > 1 ? "s" : ""} rechazado{rechazados.length > 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-red-500 mt-0.5">Revisa el comentario de tu zona y reenvía.</p>
            </div>
          </div>
        )}

        {/* Zona: pendientes primero */}
        {esZona && pendientes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-[13px] font-black uppercase tracking-wide text-amber-700">
                Por revisar ({pendientes.length})
              </h2>
            </div>
            <div className="space-y-2.5">
              {pendientes.map(r => (
                <TarjetaRegistro key={r.id} r={r} onClick={() => navigate(`/planificacion/${r.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Lista principal */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-black uppercase tracking-wide text-stone-600">
              {esMonitor ? "Planificaciones aprobadas" : esZona ? "Revisados" : "Mis registros"}
            </h2>
          </div>

          {cargando ? <Spinner /> : (
            <div className="space-y-2.5">
              {(esZona ? registros.filter(r => r.estado !== "pendiente") : registros).map(r => (
                <TarjetaRegistro key={r.id} r={r} onClick={() => navigate(`/planificacion/${r.id}`)} />
              ))}
              {registros.length === 0 && (
                <p className="text-center text-stone-400 text-[13px] py-8">No hay registros aún.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB — solo coordinador y admin */}
      {(esCoord || usuario.rol === "admin") && (
        <button onClick={() => navigate("/planificacion/nueva")}
          className="fixed bottom-20 right-5 h-14 w-14 rounded-full bg-[#1A4D2E] shadow-xl shadow-[#1A4D2E]/30 flex items-center justify-center active:scale-95 transition z-30">
          <Plus className="h-6 w-6 text-white" />
        </button>
      )}

      <TabBar />

      {/* Modal confirmación actualizar aplicación */}
      {modalActualizar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4">
            <div>
              <h2 className="text-[15px] font-black text-stone-900">¿Actualizar la aplicación?</h2>
            </div>
            <p className="text-[13px] text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-3 leading-relaxed">
              Esto va a recargar la página y limpiar los datos guardados localmente (como el caché de Tabla Densidad).
              No perderás nada de lo que ya está guardado en el servidor, pero si tienes un formulario sin enviar, se va a perder.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setModalActualizar(false)} disabled={actualizando}
                className="flex-1 rounded-2xl border-2 border-stone-300 py-3 text-stone-600 font-bold text-[13px]">
                Cancelar
              </button>
              <button onClick={handleActualizar} disabled={actualizando}
                className="flex-1 rounded-2xl bg-[#1A4D2E] py-3 text-white font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60">
                <RefreshCw className={`h-3.5 w-3.5 ${actualizando ? "animate-spin" : ""}`} /> {actualizando ? "Actualizando..." : "Sí, actualizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
