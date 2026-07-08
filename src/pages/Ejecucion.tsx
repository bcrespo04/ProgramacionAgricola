import { Tractor } from "lucide-react";
import { TabBar } from "../components/layout/TabBar";

export default function Ejecucion() {
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
      </div>

      <div className="px-4 py-16 flex flex-col items-center text-center gap-3">
        <Tractor className="h-10 w-10 text-stone-300" />
        <p className="text-stone-500 text-[13px] font-black">Próximamente</p>
        <p className="text-stone-400 text-[12px] max-w-xs">
          El seguimiento de ejecución en campo estará disponible aquí.
        </p>
      </div>

      <TabBar />
    </div>
  );
}
