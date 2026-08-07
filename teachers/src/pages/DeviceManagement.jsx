import { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import DeviceRegisterModal from '../components/DeviceRegisterModal';
import { Cpu, Wifi, WifiOff, Plus, Edit2, Trash2, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export default function DeviceManagement() {
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  useEffect(() => {
    fetchDevicesAndClasses();
  }, []);

  const fetchDevicesAndClasses = async () => {
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

  const isOnline = (lastHeartbeat) => {
    if (!lastHeartbeat) return false;
    const diff = Date.now() - new Date(lastHeartbeat).getTime();
    return diff < 6 * 60 * 1000; // heartbeat inside last 6 minutes
  };

  const handleAssignClass = async (deviceId, assignedClassId) => {
    try {
      await api.put(`/devices/${deviceId}`, { assignedClassId });
      fetchDevicesAndClasses();
    } catch {
      setError('Failed to assign class to device.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-400" />
            NFC Reader Hardware Devices
          </h1>
          <p className="text-slate-400 text-sm mt-1">ESP8266 + PN532 door readers monitoring and heartbeat status</p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Reader</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDevicesAndClasses} />}

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => {
          const online = isOnline(device.lastHeartbeat);
          return (
            <div key={device._id} className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                  {device.deviceId}
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
                  {device.location}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Last Heartbeat: {device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleTimeString() : 'Never'}
                </p>
              </div>

              {/* Classroom Assignment Dropdown */}
              <div className="pt-3 border-t border-slate-800 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase">Assigned Classroom</label>
                <select
                  value={device.assignedClassId || ''}
                  onChange={(e) => handleAssignClass(device._id, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Unassigned</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.room})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <DeviceRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegistered={fetchDevicesAndClasses}
        classes={classes}
      />
    </div>
  );
}
