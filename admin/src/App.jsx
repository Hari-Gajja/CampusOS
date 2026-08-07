import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ClassManagement from './pages/ClassManagement';
import DeviceManagement from './pages/DeviceManagement';
import AttendanceOverview from './pages/AttendanceOverview';
import SystemSettings from './pages/SystemSettings';
import AuditLogs from './pages/AuditLogs';
import ManageAdmins from './pages/ManageAdmins';
import GlobalReports from './pages/GlobalReports';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/classes" element={<ClassManagement />} />
                <Route path="/devices" element={<DeviceManagement />} />
                <Route path="/attendance-overview" element={<AttendanceOverview />} />
                <Route path="/settings" element={<SystemSettings />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/manage-admins" element={<ManageAdmins />} />
                <Route path="/global-reports" element={<GlobalReports />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
