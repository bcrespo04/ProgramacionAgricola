import { NavLink } from "react-router-dom";
import { Sprout, Tractor, Table2 } from "lucide-react";

const TABS = [
  { to: "/",               label: "Planificación", icon: Sprout,  end: true },
  { to: "/ejecucion",      label: "Ejecución",      icon: Tractor, end: false },
  { to: "/tabla-densidad", label: "Tabla Densidad", icon: Table2,  end: false },
];

export function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 flex">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-2.5 transition ${
              isActive ? "text-[#1A4D2E]" : "text-stone-400"
            }`
          }>
          {({ isActive }) => (
            <>
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
