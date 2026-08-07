import { createContext, useContext, useEffect, useState } from 'react';
import { initSocket, disconnectSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!user || !token) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketInstance = initSocket(token);
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('device_heartbeat', (data) => {
      setToastNotification({
        id: Date.now(),
        type: 'info',
        title: 'Device Heartbeat Received',
        message: `Reader '${data.deviceId}' reported online at ${data.location}`,
      });
    });

    socketInstance.on('attendance_update', (data) => {
      setToastNotification({
        id: Date.now(),
        type: 'success',
        title: 'System Attendance Event',
        message: `${data.student?.name || 'Student'} scanned door reader (${data.status}).`,
      });
    });

    return () => {
      disconnectSocket();
    };
  }, [user]);

  const clearToast = () => setToastNotification(null);

  return (
    <SocketContext.Provider value={{ socket, isConnected, toastNotification, clearToast }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
