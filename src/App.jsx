import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AttendancePage from "./pages/AttendancePage";
import AddUser from "./pages/AddUser";
import MarkAttendance from "./pages/MarkAttendance";
import AllUsers from "./pages/AllUsers";
import EditUser from "./pages/EditUser";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";
import AttendanceReport from "./pages/AttendanceReport";
import UserPercentage from "./pages/UserPercentage";
import DeletedUsers from "./pages/DeletedUsers";
import SubmitReason from "./pages/SubmitReason";
import MyRequests from "./pages/MyRequests";
import AbsenceManagement from "./pages/AbsenceManagement";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* User Routes */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <AttendancePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/submit-reason"
          element={
            <ProtectedRoute>
              <SubmitReason />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-requests"
          element={
            <ProtectedRoute>
              <MyRequests />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/absence-management"
          element={
            <ProtectedRoute>
              <AbsenceManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-user"
          element={
            <ProtectedRoute>
              <AddUser />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mark-attendance"
          element={
            <ProtectedRoute>
              <MarkAttendance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/all-users"
          element={
            <ProtectedRoute>
              <AllUsers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deleted-users"
          element={
            <ProtectedRoute>
              <DeletedUsers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance-report"
          element={
            <ProtectedRoute>
              <AttendanceReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user-percentage"
          element={
            <ProtectedRoute>
              <UserPercentage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-user/:id"
          element={
            <ProtectedRoute>
              <EditUser />
            </ProtectedRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;