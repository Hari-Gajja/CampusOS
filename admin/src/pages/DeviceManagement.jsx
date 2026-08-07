import { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import DeviceRegisterModal from '../components/DeviceRegisterModal';
import { Cpu, Wifi, WifiOff, Plus, Trash2, Clock, MapPin } from 'lucide-react';

export default function DeviceManagement() {
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const [devRes, clsRes] = await Promise.all([
        api.get('/devices').catch(() => null),
        api.get('/classes').catch(() => null),
      ]);

      if (devRes?.data?.devices) setDevices(devRes.data.devices);

      if (clsRes?.data?.classes) setClasses(clsRes.data.classes);
    } catch {
      setError('Failed to load devices.');
    } finally {
      setLoading(false);
    }
  };

  // Socket listener for live device heartbeats
  useEffect(() => {
    if (!socket) return;
    const handleHeartbeat = (data) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === data.deviceId
            ? { ...d, lastHeartbeat: data.lastHeartbeat, isActive: true }
            : d
        )
      );
    };

    socket.on('device_heartbeat', handleHeartbeat);
    return () => socket.off('device_heartbeat', handleHeartbeat);
  }, [socket]);

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('Delete this NFC reader device record?')) return;
    try {
      await api.delete(`/devices/${id}`);
      fetchDevices();
    } catch {
      setError('Failed to delete device.');
    }
  };

  const isOnline = (lastHeartbeat) => {
    if (!lastHeartbeat) return false;
    return Date.now() - new Date(lastHeartbeat).getTime() < 6 * 60 * 1000;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-rose-400" />
            NFC Door Readers Hardware Registry
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage ESP8266 + PN532 hardware readers and issue secret API credentials</p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-semibold text-xs shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Reader</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDevices} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((d) => {
          const online = isOnline(d.lastHeartbeat);
          return (
            <div key={d._id} className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                  {d.deviceId}
                </span>

                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    online
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {online ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 animate-pulse" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Offline</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {d.location}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Last Heartbeat: {d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleTimeString() : 'Never'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Class: {d.assignedClassId || 'Unassigned'}</span>
                <button
                  onClick={() => handleDeleteDevice(d._id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                  title="Delete Device"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <DeviceRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegistered={fetchDevices}
        classes={classes}
      />
    </div>
  );
}
