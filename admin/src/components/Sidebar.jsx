import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Cpu,
  FileBarChart,
  Settings,
  ShieldAlert,
  UserCheck,
  BarChart3,
  User,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'User Management', path: '/users', icon: Users },
  { name: 'Class Management', path: '/classes', icon: BookOpen },
  { name: 'NFC Readers Hub', path: '/devices', icon: Cpu },
  { name: 'Attendance Overview', path: '/attendance-overview', icon: FileBarChart },
  { name: 'System Settings', path: '/settings', icon: Settings },
  { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert },
  { name: 'Manage Admins', path: '/manage-admins', icon: UserCheck },
  { name: 'Global Reports', path: '/global-reports', icon: BarChart3 },
  { name: 'Profile', path: '/profile', icon: User },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-1 overflow-y-auto max-h-full">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            System Administration
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </aside>
    </>
  );
}
