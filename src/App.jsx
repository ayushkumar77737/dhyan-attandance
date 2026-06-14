import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AttendancePage from "./pages/AttendancePage";
import AddUser from "./pages/AddUser";
import MarkAttendance from "./pages/MarkAttendance";
import AllUsers from "./pages/AllUsers";
import AllAdmins from "./pages/AllAdmins";
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
import UserActivities from "./pages/UserActivities";
import GetId from "./pages/GetId";
import IdRequests from "./pages/IdRequests";
import SmartAttendance from "./pages/SmartAttendance";
import ShowQR from "./pages/ShowQR";
import ContactSettings from "./pages/ContactSettings";
import HelpSupport from "./pages/HelpSupport";
import BlockedAccounts from "./pages/BlockedAccounts";
import Directory from "./pages/Directory";
import AddAdmin from "./pages/AddAdmin";
import AdminLogs from "./pages/AdminLogs";
import EditAdmin from "./pages/EditAdmin";
import MyActivity from "./pages/MyActivity";
import AccessControl from "./pages/AccessControl";
import RequireAccess from "./components/RequireAccess";

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
          path="/my-activity"
          element={
            <ProtectedRoute>
              <MyActivity />
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

        <Route
          path="/help-support"
          element={
            <ProtectedRoute>
              <HelpSupport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/directory"
          element={
            <ProtectedRoute>
              <Directory />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard — never gated, everyone lands here */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Access Control — super-admin gate is inside the component */}
        <Route
          path="/access-control"
          element={
            <ProtectedRoute>
              <AccessControl />
            </ProtectedRoute>
          }
        />

        {/* Controllable Admin Routes — wrapped in RequireAccess */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="notifications">
                <Notifications />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/absence-management"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="absenceManagement">
                <AbsenceManagement />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-user"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="addUser">
                <AddUser />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-admin"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="addAdmin">
                <AddAdmin />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mark-attendance"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="markAttendance">
                <MarkAttendance />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-attendance"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="smartAttendance">
                <SmartAttendance />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/all-users"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="allUsers">
                <AllUsers />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/all-admins"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="allAdmins">
                <AllAdmins />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/deleted-users"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="deletedUsers">
                <DeletedUsers />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance-report"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="attendanceReport">
                <AttendanceReport />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/user-percentage"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="userPercentage">
                <UserPercentage />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/track-ticket"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="trackTicket">
                <TrackTicket />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile-registration"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="profileRegistration">
                <ProfileRegistration />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/toggle-status"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="toggleStatus">
                <ToggleStatus />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/session-feedbacks"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="sessionFeedbacks">
                <SessionFeedbacks />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/all-profiles"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="allProfiles">
                <AllProfiles />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="activityLogs">
                <ActivityLogs />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="activityLogs">
                <ActivityLogs />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/user-activities"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="userActivities">
                <UserActivities />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/id-requests"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="idRequests">
                <IdRequests />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contact-settings"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="contactSettings">
                <ContactSettings />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/blocked-accounts"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="blockedAccounts">
                <BlockedAccounts />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-logs"
          element={
            <ProtectedRoute>
              <RequireAccess pageId="adminLogs">
                <AdminLogs />
              </RequireAccess>
            </ProtectedRoute>
          }
        />

        {/* Edit pages — reached only from within gated pages, left ungated */}
        <Route
          path="/edit-user/:id"
          element={
            <ProtectedRoute>
              <EditUser />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-admin/:id"
          element={
            <ProtectedRoute>
              <EditAdmin />
            </ProtectedRoute>
          }
        />

        {/* Public auth helpers */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/get-id" element={<GetId />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;