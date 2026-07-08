import { Table2 } from "lucide-react";
import { useTablaDensidad } from "../lib/useTablaDensidad";
import { Spinner } from "../components/ui";
import { TabBar } from "../components/layout/TabBar";
import { fmt } from "../lib/calculations";

export default function TablaDensidadView() {
  const { tabla, cargando, refrescando, error, refrescar } = useTablaDensidad();

  return (
    <div className="min-h-screen bg-[#F7F5F0] pb-24">
      <div className="bg-[#1A4D2E] px-5 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Table2 className="h-4 w-4 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
            Programación Agrícola
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-white text-2xl font-black">Tabla Densidad</h1>
            <p className="text-emerald-400 text-[12px]">Consulta de referencia · solo lectura</p>
          </div>
          <button onClick={() => refrescar()} disabled={refrescando || cargando}
            className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 active:scale-95 transition disabled:opacity-60">
            🔄 {refrescando ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {cargando ? (
          <Spinner />
        ) : error ? (
          <p className="text-center text-red-500 text-[13px] py-8">{error}</p>
        ) : tabla.length === 0 ? (
          <p className="text-center text-stone-400 text-[13px] py-8">No hay datos en tabla_densidad.</p>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
            <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[560px] text-[11px] tabular-nums border-collapse">
                <thead className="sticky top-0 z-10 bg-stone-100">
                  <tr className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
                    <th className="px-3 py-2 text-left">Año</th>
                    <th className="px-3 py-2 text-right">Dens. plan</th>
                    <th className="px-3 py-2 text-right">Dens. FS</th>
                    <th className="px-3 py-2 text-right">HA/J</th>
                    <th className="px-3 py-2 text-right">TM/C</th>
                    <th className="px-3 py-2 text-right">Sacos/HA</th>
                    <th className="px-3 py-2 text-right">Sacos/P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {tabla.map((f, i) => (
                    <tr key={f.id} className={i % 2 ? "bg-stone-50/50" : ""}>
                      <td className="px-3 py-2 font-bold text-stone-800">{f.anio_siembra}</td>
                      <td className="px-3 py-2 text-right text-stone-700">{f.densidad_plan}</td>
                      <td className="px-3 py-2 text-right text-stone-500">{fmt(f.densidad_fs)}</td>
                      <td className="px-3 py-2 text-right text-stone-700">{fmt(f.ha_j)}</td>
                      <td className="px-3 py-2 text-right text-stone-700">{fmt(f.tm_c)}</td>
                      <td className="px-3 py-2 text-right text-stone-500">{fmt(f.sacos_ha)}</td>
                      <td className="px-3 py-2 text-right text-stone-500">{fmt(f.sacos_p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
}
