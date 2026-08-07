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

    socketInstance.on('attendance_update', (data) => {
      // Live attendance stream updates in table directly without intrusive toast messages
    });

    socketInstance.on('unregistered_nfc_scanned', (data) => {
      // Unregistered card scans handled silently without intrusive toast messages
    });

    socketInstance.on('session_started', (data) => {
      setToastNotification({
        id: Date.now(),
        type: 'info',
        title: 'Session Started',
        message: `Class session activated. Automatic phone lock command dispatched to FCM.`,
      });
    });

    socketInstance.on('session_ended', (data) => {
      setToastNotification({
        id: Date.now(),
        type: 'info',
        title: 'Session Ended',
        message: `Class session completed. Phone unblock command sent.`,
      });
    });

    return () => {
      disconnectSocket();
    };
  }, [user]);

  const joinRooms = (classIds) => {
    if (socket && Array.isArray(classIds) && classIds.length) {
      socket.emit('join_teacher_room', classIds);
    }
  };

  const clearToast = () => setToastNotification(null);

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinRooms, toastNotification, clearToast }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
