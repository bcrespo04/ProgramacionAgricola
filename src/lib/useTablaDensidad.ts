import { useState, useEffect, useCallback } from "react";
import type { TablaDensidad } from "../types";
import { getTablaDensidad } from "./api";

const KEY = "prog-agricola:tabla-densidad";
const TTL = 24 * 60 * 60 * 1000;

function leerCache(): TablaDensidad[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > TTL) { localStorage.removeItem(KEY); return null; }
    return data;
  } catch { return null; }
}

export function useTablaDensidad() {
  const [tabla, setTabla] = useState<TablaDensidad[]>(() => leerCache() ?? []);
  const [cargando, setCargando] = useState(() => !leerCache());
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback((modo: "cargando" | "refrescando") => {
    modo === "refrescando" ? setRefrescando(true) : setCargando(true);
    setError(null);
    return getTablaDensidad()
      .then(data => {
        setTabla(data);
        localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data }));
      })
      .catch(e => setError(e.message))
      .finally(() => modo === "refrescando" ? setRefrescando(false) : setCargando(false));
  }, []);

  useEffect(() => {
    const cached = leerCache();
    if (cached?.length) { setTabla(cached); setCargando(false); return; }
    cargar("cargando");
  }, [cargar]);

  const refrescar = useCallback(() => {
    localStorage.removeItem(KEY);
    return cargar("refrescando");
  }, [cargar]);

  return { tabla, cargando, refrescando, error, refrescar };
}
