import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NuevaPlanificacion from "./pages/NuevaPlanificacion";
import DetallePlanificacion from "./pages/DetallePlanificacion";
import Ejecucion from "./pages/Ejecucion";
import EjecucionForm from "./pages/EjecucionForm";
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
        <Route path="/planificacion/:id/editar" element={
          <ProtectedRoute roles={["coordinador","admin"]}>
            <NuevaPlanificacion />
          </ProtectedRoute>
        } />
        <Route path="/planificacion/:id" element={
          <ProtectedRoute>
            <DetallePlanificacion />
          </ProtectedRoute>
        } />
        <Route path="/ejecucion" element={
          <ProtectedRoute roles={["coordinador","zona_sur","zona_norte","admin"]}>
            <Ejecucion />
          </ProtectedRoute>
        } />
        <Route path="/ejecucion/nuevo" element={
          <ProtectedRoute roles={["coordinador"]}>
            <EjecucionForm />
          </ProtectedRoute>
        } />
        <Route path="/ejecucion/:id/editar" element={
          <ProtectedRoute roles={["coordinador"]}>
            <EjecucionForm />
          </ProtectedRoute>
        } />
        <Route path="/tabla-densidad" element={<ProtectedRoute><TablaDensidadView /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
