import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Calendar as CalendarIcon, Clock, MapPin, User } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MySchedule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/classes');
      setClasses(res.data.classes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedule.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // Filter slots for selected day
  const dayClasses = classes.flatMap((cls) => {
    const slots = (cls.schedule || []).filter((s) => s.dayOfWeek === selectedDay);
    return slots.map((s) => ({
      ...cls,
      slot: s,
    }));
  });

  dayClasses.sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Class Timetable</h1>
          <p className="text-slate-400 text-sm mt-1">Weekly schedule of enrolled courses</p>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchSchedule} />}

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-all whitespace-nowrap ${
              selectedDay === idx
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Day Schedule Cards */}
      <div className="space-y-4">
        {dayClasses.length === 0 ? (
          <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800">
            <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No classes scheduled for {DAYS[selectedDay]}</h3>
            <p className="text-xs text-slate-500 mt-1">Select another day of the week above to view your timetable.</p>
          </div>
        ) : (
          dayClasses.map(({ _id, name, subject, room, teacherId, slot }) => (
            <div
              key={`${_id}-${slot.startTime}`}
              className="p-6 rounded-3xl glass-card flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">
                    {subject}
                  </span>
                  <h3 className="text-lg font-bold text-white">{name}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{teacherId?.userId?.name || 'Faculty'}</span>
                  </div>
                  <span>&bull;</span>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{room}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800 self-start md:self-auto">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white font-mono">
                  {slot.startTime} - {slot.endTime}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
