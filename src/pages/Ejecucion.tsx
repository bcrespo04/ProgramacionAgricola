import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tractor, Plus } from "lucide-react";
import { useAuth } from "../lib/auth";
import { getEjecuciones } from "../lib/api";
import { Spinner } from "../components/ui";
import { TabBar } from "../components/layout/TabBar";
import { fmt } from "../lib/calculations";
import type { EjecucionDiaria } from "../types";

const fmtFechaCorta = (fecha: string) =>
  new Date(fecha + "T12:00:00").toLocaleDateString("es-NI", { day: "2-digit", month: "short", year: "numeric" });

const lotesCosechadosStr = (e: EjecucionDiaria) =>
  e.ejecucion_lotes?.map(el => el.lotes_cosecha?.lote).filter(Boolean).join(" ~ ") || "—";

export default function Ejecucion() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esCoord = usuario?.rol === "coordinador";

  const [historial, setHistorial] = useState<EjecucionDiaria[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    getEjecuciones(usuario)
      .then(setHistorial)
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [usuario]);

  return (
    <div className="min-h-screen bg-[#F7F5F0] pb-24">
      <div className="bg-[#1A4D2E] px-5 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Tractor className="h-4 w-4 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
            Programación Agrícola
          </span>
        </div>
        <h1 className="text-white text-2xl font-black">Ejecución</h1>
        <p className="text-emerald-400 text-[12px]">Histórico de reportes diarios</p>
      </div>

      <div className="px-4 py-4">
        {cargando ? (
          <Spinner />
        ) : historial.length === 0 ? (
          <p className="text-center text-stone-400 text-[13px] py-8">No hay ejecuciones registradas.</p>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
            <div className="max-h-[75vh] overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[1050px] text-[11px] tabular-nums border-collapse">
                <thead className="sticky top-0 z-10 bg-stone-100">
                  <tr className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
                    <th className="px-3 py-2 text-left">Fecha</th>
                    {!esCoord && <th className="px-3 py-2 text-left">Sector</th>}
                    <th className="px-3 py-2 text-right">Corteros</th>
                    <th className="px-3 py-2 text-right">Evacuadores</th>
                    <th className="px-3 py-2 text-right">Coyoleros</th>
                    <th className="px-3 py-2 text-right">Cargadores</th>
                    <th className="px-3 py-2 text-right">Fruta día ant.</th>
                    <th className="px-3 py-2 text-right">TM enviadas</th>
                    <th className="px-3 py-2 text-right">Bacadillas</th>
                    <th className="px-3 py-2 text-right">Sacos día</th>
                    <th className="px-3 py-2 text-right">Sacos env.</th>
                    <th className="px-3 py-2 text-right">Ha coyol</th>
                    <th className="px-3 py-2 text-right">Ha cosech.</th>
                    <th className="px-3 py-2 text-left">Lotes</th>
                    <th className="px-3 py-2 text-center">Lote extra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {historial.map((e, i) => {
                    const lotesStr = lotesCosechadosStr(e);
                    return (
                      <tr key={e.id} className={i % 2 ? "bg-stone-50/50" : ""}>
                        <td className="px-3 py-2 font-bold text-stone-800 whitespace-nowrap">{fmtFechaCorta(e.fecha)}</td>
                        {!esCoord && <td className="px-3 py-2 text-stone-700">S{e.sector}</td>}
                        <td className="px-3 py-2 text-right text-stone-700">{e.corteros ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.evacuadores ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.coyoleros ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.cargadores ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.fruta_dia_anterior != null ? fmt(e.fruta_dia_anterior) : "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.tm_enviadas != null ? fmt(e.tm_enviadas) : "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.bacadillas ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.sacos_dia ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.sacos_enviados ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.ha_coyol != null ? fmt(e.ha_coyol) : "—"}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{e.ha_cosechadas != null ? fmt(e.ha_cosechadas) : "—"}</td>
                        <td className="px-3 py-2 text-stone-700">
                          <span className="block max-w-[220px] truncate" title={lotesStr}>{lotesStr}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {e.lotes_extra
                            ? <span title={e.lotes_extra} className="text-amber-500 font-black">●</span>
                            : <span className="text-stone-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {esCoord && (
        <button onClick={() => navigate("/ejecucion/nuevo")}
          className="fixed bottom-20 right-5 h-14 w-14 rounded-full bg-[#1A4D2E] shadow-xl shadow-[#1A4D2E]/30 flex items-center justify-center active:scale-95 transition z-30">
          <Plus className="h-6 w-6 text-white" />
        </button>
      )}

      <TabBar />
    </div>
  );
}
