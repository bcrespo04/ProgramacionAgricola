import { fmt } from "../lib/calculations";

export interface FilaLoteCosechaConsolidada {
  grupoId: string;
  anioSiembra: string | number;
  loteId: string;
  lote: string;
  ha: number;
  dens: number;
  peso: number;
  rp: number;
  tm: number;
  cort: number;
}

export interface FilaLoteCoyoleoConsolidada {
  grupoId: string;
  anioSiembra: string | number;
  loteId: string;
  lote: string;
  ha: number;
  coyEmp: number;
  coyCont: number;
  tmFs: number;
}

interface ConGrupo {
  grupoId: string;
  esInicioGrupo: boolean;
  tamGrupo: number;
  esGrupoNuevo: boolean;
}

// Borde doble entre un grupo de siembra y el siguiente.
const SEP_GRUPO = "border-t-4 border-double border-t-stone-400";
const TH_CLASS = "px-3 py-2 text-[9px] font-black uppercase tracking-wider text-stone-600";

// Marca, por fila, si es el inicio de su grupo de siembra (para el rowSpan de
// la columna "Siembra") y si ese grupo es distinto del primero de la tabla
// (para dibujar la línea doble entre un grupo de siembra y el siguiente).
function anotarGrupos<T extends { grupoId: string }>(filas: T[]): (T & ConGrupo)[] {
  const grupoIds = Array.from(new Set(filas.map(f => f.grupoId)));
  return filas.map((f, i) => {
    const esInicioGrupo = i === 0 || filas[i - 1].grupoId !== f.grupoId;
    const tamGrupo = esInicioGrupo ? filas.filter(x => x.grupoId === f.grupoId).length : 0;
    const esGrupoNuevo = esInicioGrupo && grupoIds.indexOf(f.grupoId) > 0;
    return { ...f, esInicioGrupo, tamGrupo, esGrupoNuevo };
  });
}

/**
 * Tabla consolidada de todos los lotes de Cosecha del registro, agrupados por
 * siembra. Dens. y Peso no se muestran (siguen en el modelo, se usan para
 * Densidad Rac/Fs y TM), y el TOTAL de RP es un promedio, no una suma.
 */
export function TablaCosechaConsolidada({ filas }: { filas: FilaLoteCosechaConsolidada[] }) {
  if (!filas.length) {
    return <p className="text-[11px] text-stone-400 text-center py-4">Sin lotes de cosecha registrados.</p>;
  }

  const conGrupo = anotarGrupos(filas);
  const totHA   = filas.reduce((a, f) => a + f.ha, 0);
  const totRP   = filas.reduce((a, f) => a + f.rp, 0);
  const totTM   = filas.reduce((a, f) => a + f.tm, 0);
  const totCort = filas.reduce((a, f) => a + f.cort, 0);
  const rpProm  = filas.length ? totRP / filas.length : 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-x-auto">
      <table className="w-full min-w-[480px] text-[11px] tabular-nums border-collapse">
        <thead>
          <tr className="bg-stone-50">
            <th className={`${TH_CLASS} text-left`}>Siembra</th>
            <th className={`${TH_CLASS} text-left`}>Lote</th>
            <th className={`${TH_CLASS} text-right`}>HA</th>
            <th className={`${TH_CLASS} text-right`}>RP</th>
            <th className={`${TH_CLASS} text-right`}>TM</th>
            <th className={`${TH_CLASS} text-right`}>Cort</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {conGrupo.map((f, i) => (
            <tr key={f.loteId}
              className={`${f.esGrupoNuevo ? SEP_GRUPO : ""} ${i % 2 ? "bg-stone-50/40" : ""}`}>
              {f.esInicioGrupo && (
                <td rowSpan={f.tamGrupo}
                  className="px-3 py-2 align-top font-black text-[#E07B39] border-r border-stone-100 bg-orange-50/40">
                  {f.anioSiembra || "—"}
                </td>
              )}
              <td className="px-3 py-2 font-bold text-stone-800">{f.lote || "—"}</td>
              <td className="px-3 py-2 text-right text-stone-700">{fmt(f.ha)}</td>
              <td className="px-3 py-2 text-right text-stone-700">{fmt(f.rp, 2)}</td>
              <td className="px-3 py-2 text-right text-stone-700">{fmt(f.tm)}</td>
              <td className="px-3 py-2 text-right text-stone-700">{f.cort}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-orange-50 font-black text-[#E07B39] border-t-2 border-orange-200">
            <td className="px-3 py-2" colSpan={2}>TOTAL</td>
            <td className="px-3 py-2 text-right">{fmt(totHA)}</td>
            <td className="px-3 py-2 text-right">{fmt(rpProm, 2)}</td>
            <td className="px-3 py-2 text-right">{fmt(totTM)}</td>
            <td className="px-3 py-2 text-right">{totCort}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Tabla consolidada de todos los lotes de Coyoleo del registro, agrupados por
 * siembra. Coy. emp y Coy. cont se combinan en una sola columna "Coyoleros".
 */
export function TablaCoyoleoConsolidada({ filas }: { filas: FilaLoteCoyoleoConsolidada[] }) {
  if (!filas.length) {
    return <p className="text-[11px] text-stone-400 text-center py-4">Sin lotes de coyoleo registrados.</p>;
  }

  const conGrupo = anotarGrupos(filas);
  const totHA        = filas.reduce((a, f) => a + f.ha, 0);
  const totCoyoleros = filas.reduce((a, f) => a + f.coyEmp + f.coyCont, 0);
  const totTmFs       = filas.reduce((a, f) => a + f.tmFs, 0);

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-x-auto">
      <table className="w-full min-w-[460px] text-[11px] tabular-nums border-collapse">
        <thead>
          <tr className="bg-stone-50">
            <th className={`${TH_CLASS} text-left`}>Siembra</th>
            <th className={`${TH_CLASS} text-left`}>Lote</th>
            <th className={`${TH_CLASS} text-right`}>HA</th>
            <th className={`${TH_CLASS} text-right`}>Coyoleros</th>
            <th className={`${TH_CLASS} text-right`}>TM/Fs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {conGrupo.map((f, i) => (
            <tr key={f.loteId}
              className={`${f.esGrupoNuevo ? SEP_GRUPO : ""} ${i % 2 ? "bg-stone-50/40" : ""}`}>
              {f.esInicioGrupo && (
                <td rowSpan={f.tamGrupo}
                  className="px-3 py-2 align-top font-black text-[#2563A8] border-r border-stone-100 bg-blue-50/40">
                  {f.anioSiembra || "—"}
                </td>
              )}
              <td className="px-3 py-2 font-bold text-stone-800">{f.lote || "—"}</td>
              <td className="px-3 py-2 text-right text-stone-700">{fmt(f.ha)}</td>
              <td className="px-3 py-2 text-right text-stone-700">{f.coyEmp + f.coyCont}</td>
              <td className="px-3 py-2 text-right text-stone-700">{fmt(f.tmFs)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-blue-50 font-black text-[#2563A8] border-t-2 border-blue-200">
            <td className="px-3 py-2" colSpan={2}>TOTAL</td>
            <td className="px-3 py-2 text-right">{fmt(totHA)}</td>
            <td className="px-3 py-2 text-right">{totCoyoleros}</td>
            <td className="px-3 py-2 text-right">{fmt(totTmFs)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
