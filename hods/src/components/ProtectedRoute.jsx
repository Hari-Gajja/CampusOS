import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!['hod', 'teacher', 'admin'].includes(user?.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 glass-panel rounded-2xl border border-rose-500/20 shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your role (<span className="text-rose-400 font-semibold uppercase">{user?.role}</span>) does not have authorization to access the HOD Portal.
          </p>
          <a
            href="/login"
            className="inline-block px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium text-sm transition-colors"
          >
            Return to Login
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
