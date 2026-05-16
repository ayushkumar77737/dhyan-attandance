import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
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
import Notifications from "./pages/Notifications";
import MyNotifications from "./pages/MyNotifications";
import TicketingSupport from "./pages/TicketingSupport";
import TrackTicket from "./pages/TrackTicket";
import ProfileRegistration from "./pages/ProfileRegistration";
import MyProfile from "./pages/MyProfile";
import ToggleStatus from "./pages/ToggleStatus";
import ShareExperience from "./pages/ShareExperience";
import SessionFeedbacks from "./pages/SessionFeedbacks";
import AllProfiles from "./pages/AllProfiles";
import ActivityLogs from "./pages/ActivityLogs";
import GetId from "./pages/GetId";
import IdRequests from "./pages/IdRequests";
import SmartAttendance from "./pages/SmartAttendance";
import ShowQR from "./pages/ShowQR";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Route */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

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

        <Route
          path="/my-notifications"
          element={
            <ProtectedRoute>
              <MyNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ticketing-support"
          element={
            <ProtectedRoute>
              <TicketingSupport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-profile"
          element={
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/share-experience"
          element={
            <ProtectedRoute>
              <ShareExperience />
            </ProtectedRoute>
          }
        />

        <Route
          path="/track-ticket"
          element={
            <ProtectedRoute>
              <TrackTicket />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile-registration"
          element={
            <ProtectedRoute>
              <ProfileRegistration />
            </ProtectedRoute>
          }
        />

        <Route
          path="/toggle-status"
          element={
            <ProtectedRoute>
              <ToggleStatus />
            </ProtectedRoute>
          }
        />

        <Route
          path="/session-feedbacks"
          element={
            <ProtectedRoute>
              <SessionFeedbacks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/all-profiles"
          element={
            <ProtectedRoute>
              <AllProfiles />
            </ProtectedRoute>
          }
        />

        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/show-qr"
          element={
            <ProtectedRoute>
              <ShowQR />
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
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
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
        <Route
          path="/id-requests"
          element={
            <ProtectedRoute>
              <IdRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/smart-attendance"
          element={
            <ProtectedRoute>
              <SmartAttendance />
            </ProtectedRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/get-id" element={<GetId />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;