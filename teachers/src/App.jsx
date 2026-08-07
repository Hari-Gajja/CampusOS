import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassesManagement from './pages/ClassesManagement';
import LiveAttendance from './pages/LiveAttendance';
import AttendanceReports from './pages/AttendanceReports';
import LatecomerList from './pages/LatecomerList';
import DeviceManagement from './pages/DeviceManagement';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Teacher Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/classes" element={<ClassesManagement />} />
                <Route path="/live-attendance" element={<LiveAttendance />} />
                <Route path="/reports" element={<AttendanceReports />} />
                <Route path="/latecomers" element={<LatecomerList />} />
                <Route path="/devices" element={<DeviceManagement />} />
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
