import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBell } from 'react-icons/hi2';
import api from '../api/axios';

const timeAgo = (date) => {
  const minutes = Math.round((Date.now() - new Date(date)) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString();
};

const NotificationBell = () => {
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = () => api.get('/account/notifications').then(res => setData(res.data)).catch(() => {});

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const markAllRead = async () => {
    await api.post('/account/notifications/read', {});
    load();
  };

  const openNotification = async (n) => {
    if (!n.readAt) await api.post('/account/notifications/read', { ids: [n.id] });
    setOpen(false);
    load();
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-md text-brand-100 hover:text-white hover:bg-brand-700"
        title="Notifications"
        aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`}
      >
        <HiOutlineBell className="w-6 h-6" />
        {data.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {data.unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:text-brand-800">Mark all read</button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {data.notifications.map(n => (
              <li key={n.id}>
                <button onClick={() => openNotification(n)} className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${n.readAt ? '' : 'bg-brand-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.readAt ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>{n.title}</p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 line-clamp-3 whitespace-pre-line">{n.message}</p>
                </button>
              </li>
            ))}
            {data.notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-500">No notifications yet.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
