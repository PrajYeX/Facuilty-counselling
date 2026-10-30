import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import ManageColleges from './pages/admin/ManageColleges';
import ManageScoringCriteria from './pages/admin/ManageScoringCriteria';
import VerifyFaculty from './pages/admin/VerifyFaculty';
import MeritList from './pages/admin/MeritList';
import Allotment from './pages/admin/Allotment';
import Schedule from './pages/admin/Schedule';
import Analytics from './pages/admin/Analytics';
import Announcements from './pages/admin/Announcements';
import AuditLog from './pages/admin/AuditLog';
import ScoreBreakdown from './pages/faculty/ScoreBreakdown';
import CollegeDashboard from './pages/college/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import RankLookup from './pages/RankLookup';
import Cutoffs from './pages/Cutoffs';
import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyProfile from './pages/faculty/Profile';
import UploadDocuments from './pages/faculty/UploadDocuments';
import AllotmentStatus from './pages/faculty/AllotmentStatus';
import OptionEntry from './pages/faculty/OptionEntry';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/rank-lookup" element={<RankLookup />} />
        <Route path="/cutoffs" element={<Cutoffs />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/colleges" element={<ProtectedRoute role="admin"><ManageColleges /></ProtectedRoute>} />
        <Route path="/admin/scoring" element={<ProtectedRoute role="admin"><ManageScoringCriteria /></ProtectedRoute>} />
        <Route path="/admin/verify-faculty" element={<ProtectedRoute role="admin"><VerifyFaculty /></ProtectedRoute>} />
        <Route path="/admin/merit-list" element={<ProtectedRoute role="admin"><MeritList /></ProtectedRoute>} />
        <Route path="/admin/allotment" element={<ProtectedRoute role="admin"><Allotment /></ProtectedRoute>} />
        <Route path="/admin/schedule" element={<ProtectedRoute role="admin"><Schedule /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><Analytics /></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute role="admin"><Announcements /></ProtectedRoute>} />
        <Route path="/admin/audit-log" element={<ProtectedRoute role="admin"><AuditLog /></ProtectedRoute>} />

        {/* Faculty Routes */}
        <Route path="/faculty/dashboard" element={<ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>} />
        <Route path="/faculty/profile" element={<ProtectedRoute role="faculty"><FacultyProfile /></ProtectedRoute>} />
        <Route path="/faculty/upload-documents" element={<ProtectedRoute role="faculty"><UploadDocuments /></ProtectedRoute>} />
        <Route path="/faculty/score" element={<ProtectedRoute role="faculty"><ScoreBreakdown /></ProtectedRoute>} />
        <Route path="/faculty/options" element={<ProtectedRoute role="faculty"><OptionEntry /></ProtectedRoute>} />
        <Route path="/faculty/allotment-status" element={<ProtectedRoute role="faculty"><AllotmentStatus /></ProtectedRoute>} />

        {/* College Routes */}
        <Route path="/college/dashboard" element={<ProtectedRoute role="college"><CollegeDashboard /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

export default App;
