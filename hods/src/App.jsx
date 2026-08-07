import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DepartmentOverview from './pages/DepartmentOverview';
import TeacherPerformance from './pages/TeacherPerformance';
import AttendanceReports from './pages/AttendanceReports';
import ClassInspection from './pages/ClassInspection';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected HOD Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/department-overview" element={<DepartmentOverview />} />
                <Route path="/teacher-performance" element={<TeacherPerformance />} />
                <Route path="/reports" element={<AttendanceReports />} />
                <Route path="/class-inspection" element={<ClassInspection />} />
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
