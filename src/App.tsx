import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NuevaPlanificacion from "./pages/NuevaPlanificacion";
import DetallePlanificacion from "./pages/DetallePlanificacion";
import Ejecucion from "./pages/Ejecucion";
import TablaDensidadView from "./pages/TablaDensidadView";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/planificacion/nueva" element={
          <ProtectedRoute roles={["coordinador","admin"]}>
            <NuevaPlanificacion />
          </ProtectedRoute>
        } />
        <Route path="/planificacion/:id" element={
          <ProtectedRoute>
            <DetallePlanificacion />
          </ProtectedRoute>
        } />
        <Route path="/ejecucion" element={<ProtectedRoute><Ejecucion /></ProtectedRoute>} />
        <Route path="/tabla-densidad" element={<ProtectedRoute><TablaDensidadView /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
