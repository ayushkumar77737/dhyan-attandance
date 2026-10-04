import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
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
import ScrollToTop from "./components/ScrollToTop";
import MFASetup from "./pages/MFASetup";
import MFAVerify from "./pages/MFAVerify";
import MFAProtectedRoute from "./components/MFAProtectedRoute";
import AccountRecovery from "./pages/AccountRecovery";
import AccountRecoveryStatus from "./pages/AccountRecoveryStatus";
import AccountRecoveryRequests from "./pages/AccountRecoveryRequests";
import AttendanceReport from "./pages/AttendanceReport";
import AttendanceCalendar from "./pages/AttendanceCalendar";
import UserPercentage from "./pages/UserPercentage";
import DeletedUsers from "./pages/DeletedUsers";
import SubmitReason from "./pages/SubmitReason";
import MyRequests from "./pages/MyRequests";
import AbsenceManagement from "./pages/AbsenceManagement";
import ReportIssue from "./pages/ReportIssue";
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
import SmartAttendance from "./pages/SmartAttendance";
import ShowQR from "./pages/ShowQR";
import ContactSettings from "./pages/ContactSettings";
import HelpSupport from "./pages/HelpSupport";
import BlockedAccounts from "./pages/BlockedAccounts";
import Directory from "./pages/Directory";
import AddAdmin from "./pages/AddAdmin";
import AdminLogs from "./pages/AdminLogs";
import IdRegistration from "./pages/IdRegistration";
import IdVerification from "./pages/IdVerification";
import IdCreationStatus from "./pages/IdCreationStatus";
import IdManagement from "./pages/IdManagement";
import RegisteredIds from "./pages/RegisteredIds";
import EditAdmin from "./pages/EditAdmin";
import MyActivity from "./pages/MyActivity";
import AccessControl from "./pages/AccessControl";
import AccountLock from "./pages/AccountLock";
import AdminIssues from "./pages/AdminIssues";
import UserIssues from "./pages/UserIssues";
import ContactMessages from "./pages/ContactMessages";
import RequireAccess from "./components/RequireAccess";
import MyAttendance from "./pages/MyAttendance";
import RaiseConcern from "./pages/RaiseConcern";
import ApplyLeave from "./pages/ApplyLeave";
import LeaveRequests from "./pages/LeaveRequests";
import About from "./pages/About";
import Events from "./pages/Events";
import Contact from "./pages/Contact";
import Teachings from "./pages/Teachings";
import AdminLayout from "./components/AdminLayout";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>

        {/* Public Route */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account-recovery" element={<AccountRecovery />} />
        <Route path="/account-recovery-status" element={<AccountRecoveryStatus />} />
        <Route path="/about" element={<About />} />
        <Route path="/events" element={<Events />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/teachings" element={<Teachings />} />

        {/* MFA Routes */}
        <Route
          path="/mfa-setup"
          element={
            <ProtectedRoute>
              <MFASetup />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mfa-verify"
          element={
            <ProtectedRoute>
              <MFAVerify />
            </ProtectedRoute>
          }
        />

        {/* User Routes */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute>
              <MFAProtectedRoute>
                <UserDashboard />
              </MFAProtectedRoute>
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
          path="/apply-leave"
          element={
            <ProtectedRoute>
              <ApplyLeave />
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
          path="/my-attendance"
          element={
            <ProtectedRoute>
              <MyAttendance />
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

        <Route
          path="/raise-concern"
          element={
            <ProtectedRoute>
              <RaiseConcern />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard — has its own built-in sidebar, so it stays outside the layout */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <MFAProtectedRoute>
                <AdminDashboard />
              </MFAProtectedRoute>
            </ProtectedRoute>
          }
        />

        {/* ===== Every admin page below shares the sidebar via AdminLayout ===== */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Outlet />
              </AdminLayout>
            </ProtectedRoute>
          }
        >
          {/* Access Control — super-admin gate is inside the component */}
          <Route path="/access-control" element={<AccessControl />} />

          <Route path="/account-lock" element={<RequireAccess pageId="accountLock"><AccountLock /></RequireAccess>} />
          <Route path="/report-issue" element={<RequireAccess pageId="reportIssue"><ReportIssue /></RequireAccess>} />
          <Route path="/contact-messages" element={<RequireAccess pageId="contactMessages"><ContactMessages /></RequireAccess>} />
          <Route path="/account-recovery-requests" element={<RequireAccess pageId="accountRecoveryRequests"><AccountRecoveryRequests /></RequireAccess>} />
          <Route path="/notifications" element={<RequireAccess pageId="notifications"><Notifications /></RequireAccess>} />
          <Route path="/absence-management" element={<RequireAccess pageId="absenceManagement"><AbsenceManagement /></RequireAccess>} />
          <Route path="/leaves-request" element={<RequireAccess pageId="leavesRequest"><LeaveRequests /></RequireAccess>} />
          <Route path="/add-user" element={<RequireAccess pageId="addUser"><AddUser /></RequireAccess>} />
          <Route path="/add-admin" element={<RequireAccess pageId="addAdmin"><AddAdmin /></RequireAccess>} />
          <Route path="/mark-attendance" element={<RequireAccess pageId="markAttendance"><MarkAttendance /></RequireAccess>} />
          <Route path="/smart-attendance" element={<RequireAccess pageId="smartAttendance"><SmartAttendance /></RequireAccess>} />
          <Route path="/all-users" element={<RequireAccess pageId="allUsers"><AllUsers /></RequireAccess>} />
          <Route path="/all-admins" element={<RequireAccess pageId="allAdmins"><AllAdmins /></RequireAccess>} />
          <Route path="/deleted-users" element={<RequireAccess pageId="deletedUsers"><DeletedUsers /></RequireAccess>} />
          <Route path="/attendance-report" element={<RequireAccess pageId="attendanceReport"><AttendanceReport /></RequireAccess>} />
          <Route path="/attendance-calendar" element={<RequireAccess pageId="attendanceCalendar"><AttendanceCalendar /></RequireAccess>} />
          <Route path="/user-percentage" element={<RequireAccess pageId="userPercentage"><UserPercentage /></RequireAccess>} />
          <Route path="/track-ticket" element={<RequireAccess pageId="trackTicket"><TrackTicket /></RequireAccess>} />
          <Route path="/admin-issues" element={<RequireAccess pageId="adminIssues"><AdminIssues /></RequireAccess>} />
          <Route path="/user-issues" element={<RequireAccess pageId="userIssues"><UserIssues /></RequireAccess>} />
          <Route path="/profile-registration" element={<RequireAccess pageId="profileRegistration"><ProfileRegistration /></RequireAccess>} />
          <Route path="/toggle-status" element={<RequireAccess pageId="toggleStatus"><ToggleStatus /></RequireAccess>} />
          <Route path="/session-feedbacks" element={<RequireAccess pageId="sessionFeedbacks"><SessionFeedbacks /></RequireAccess>} />
          <Route path="/all-profiles" element={<RequireAccess pageId="allProfiles"><AllProfiles /></RequireAccess>} />
          <Route path="/activity-logs" element={<RequireAccess pageId="activityLogs"><ActivityLogs /></RequireAccess>} />
          <Route path="/user-activities" element={<RequireAccess pageId="userActivities"><UserActivities /></RequireAccess>} />
          <Route path="/contact-settings" element={<RequireAccess pageId="contactSettings"><ContactSettings /></RequireAccess>} />
          <Route path="/blocked-accounts" element={<RequireAccess pageId="blockedAccounts"><BlockedAccounts /></RequireAccess>} />
          <Route path="/admin-logs" element={<RequireAccess pageId="adminLogs"><AdminLogs /></RequireAccess>} />
          <Route path="/id-registration" element={<RequireAccess pageId="idRegistration"><IdRegistration /></RequireAccess>} />
          <Route path="/id-verification" element={<RequireAccess pageId="idVerification"><IdVerification /></RequireAccess>} />
          <Route path="/id-creation-status" element={<RequireAccess pageId="idCreationStatus"><IdCreationStatus /></RequireAccess>} />
          <Route path="/id-management" element={<RequireAccess pageId="idManagement"><IdManagement /></RequireAccess>} />
          <Route path="/registered-ids" element={<RequireAccess pageId="registeredIds"><RegisteredIds /></RequireAccess>} />

          {/* Edit pages — reached only from within gated pages, left ungated */}
          <Route path="/edit-user/:id" element={<EditUser />} />
          <Route path="/edit-admin/:id" element={<EditAdmin />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;