import { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Spinner } from "./components/UI";
import { Landing, Login, Otp, Register, Security } from "./pages/PublicPages";
import {
  CastVote,
  ElectionDetail,
  ElectionList,
  History,
  Profile,
  ReceiptPage,
  Results,
  Verify,
  VoterDashboard,
} from "./pages/VoterPages";
import {
  AdminDashboard,
  AdminElections,
  Audit,
  Candidates,
  PublishResults,
  Transactions,
  Voters,
} from "./pages/AdminPages";
function Protected({
  children,
  role,
}: {
  children: ReactNode;
  role?: "admin" | "voter";
}) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role)
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />
    );
  return children;
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-otp" element={<Otp />} />
      <Route path="/security" element={<Security />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/results/:id" element={<Results />} />
      <Route
        path="/dashboard"
        element={
          <Protected role="voter">
            <VoterDashboard />
          </Protected>
        }
      />
      <Route
        path="/elections"
        element={
          <Protected role="voter">
            <ElectionList />
          </Protected>
        }
      />
      <Route
        path="/elections/:id"
        element={
          <Protected role="voter">
            <ElectionDetail />
          </Protected>
        }
      />
      <Route
        path="/elections/:id/vote"
        element={
          <Protected role="voter">
            <CastVote />
          </Protected>
        }
      />
      <Route
        path="/receipt/:id"
        element={
          <Protected role="voter">
            <ReceiptPage />
          </Protected>
        }
      />
      <Route
        path="/history"
        element={
          <Protected role="voter">
            <History />
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected role="voter">
            <Profile />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected role="admin">
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/admin/elections"
        element={
          <Protected role="admin">
            <AdminElections />
          </Protected>
        }
      />
      <Route
        path="/admin/candidates"
        element={
          <Protected role="admin">
            <Candidates />
          </Protected>
        }
      />
      <Route
        path="/admin/voters"
        element={
          <Protected role="admin">
            <Voters />
          </Protected>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <Protected role="admin">
            <Transactions />
          </Protected>
        }
      />
      <Route
        path="/admin/results"
        element={
          <Protected role="admin">
            <PublishResults />
          </Protected>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <Protected role="admin">
            <Audit />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
