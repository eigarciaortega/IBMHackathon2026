import { Navigate } from "react-router-dom";
import { getUser, isAuthenticated } from "../utils/authStorage";

export default function ProtectedRoute({ children, requiredRole }) {
  const user = getUser();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/spaces" replace />;
  }

  return children;
}