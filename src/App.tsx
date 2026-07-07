import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NuevaPlanificacion from "./pages/NuevaPlanificacion";
import DetallePlanificacion from "./pages/DetallePlanificacion";

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
      </Routes>
    </AuthProvider>
  );
}
