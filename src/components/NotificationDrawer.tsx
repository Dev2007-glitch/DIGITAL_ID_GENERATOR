import { useState, useEffect } from 'react';
import {
  getNotifications,
  markNotificationAsRead,
  type InAppNotification,
} from '../utils/idSecurityEngine';

interface NotificationDrawerProps {
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({
  userEmail,
  isOpen,
  onClose,
}: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNotifications(getNotifications(userEmail));
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  const handleMarkRead = (id: string) => {
    markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-sm h-full bg-[#0E0E14] border-l border-white/10 p-6 flex flex-col shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <h3 className="font-bold text-sm text-white">Campus Notifications</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-xs">
              No notifications for your account.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  n.read
                    ? 'bg-white/5 border-white/5 text-white/60'
                    : 'bg-white/10 border-blue-500/30 text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-white">{n.title}</h4>
                  <span className="text-[10px] text-white/40 font-mono">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-white/70">{n.message}</p>
                {!n.read && (
                  <div className="text-[10px] text-blue-400 font-bold mt-2">
                    ● Tap to mark as read
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
