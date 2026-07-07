import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import type { Rol } from "../../types";
import { useAuth } from "../../lib/auth";
import { Spinner } from "../ui";

interface Props {
  children: ReactNode;
  roles?: Rol[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { usuario, cargando } = useAuth();

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
      <Spinner />
    </div>
  );

  if (!usuario) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
