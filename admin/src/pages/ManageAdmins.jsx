import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import UserModal from '../components/UserModal';
import { UserCheck, Plus, Trash2, ShieldCheck } from 'lucide-react';

export default function ManageAdmins() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/users?role=admin&limit=100');
      setAdmins(res.data.data || []);
    } catch {
      setError('Failed to load admin accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (data) => {
    try {
      await api.post('/auth/register', { ...data, role: 'admin' });
      setIsModalOpen(false);
      fetchAdmins();
    } catch {
      setError('Failed to create admin user.');
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Revoke administrator account privileges?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchAdmins();
    } catch {
      setError('Failed to delete admin.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-rose-400" />
            Manage Administrator Accounts
          </h1>
          <p className="text-slate-400 text-sm mt-1">Super admin privileges: grant & revoke principal administrator access</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-semibold text-xs shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Admin Account</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchAdmins} />}

      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Admin Name</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Privilege Level</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {admins.map((a) => (
                <tr key={a.id || a._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-semibold text-white">{a.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-rose-300">{a.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold uppercase">
                      FULL ADMIN ACCESS
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteAdmin(a.id || a._id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddAdmin}
      />
    </div>
  );
}
