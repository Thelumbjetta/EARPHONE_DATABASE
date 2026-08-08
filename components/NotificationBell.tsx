'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Bell, ChevronUp, MessageSquare } from 'lucide-react';

type NotificationItem = {
  id: number;
  type: string;
  source_url: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to poll notifications:', err);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { method: 'POST' });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center text-gray-600 hover:text-[#111827] bg-[#f3f5f4] hover:bg-[#e8ebea] rounded-full transition-all"
        title="Notifications"
        aria-label="User notifications"
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-3 w-3 rounded-full bg-[#10b981] ring-2 ring-white animate-pulse" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#eaefec] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#eaefec] bg-[#f8faf9]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#111827]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-mono bg-[#e6f7f0] text-[#10b981] rounded-full font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-xs font-semibold text-[#10b981] hover:underline transition-colors disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#eaefec]">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500 font-sans">
                No unread notifications right now.
              </div>
            ) : (
              notifications.map((item) => (
                <Link
                  key={item.id}
                  href={item.source_url}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 hover:bg-[#f8faf9] transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {item.type === 'upvote' ? (
                        <div className="w-7 h-7 rounded-full bg-[#e6f7f0] text-[#10b981] flex items-center justify-center">
                          <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-xs">
                      <p className="text-[#111827] font-medium group-hover:text-[#10b981] transition-colors">
                        {item.content}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
