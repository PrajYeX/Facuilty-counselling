import { useEffect, useState } from 'react';
import { HiOutlineMegaphone } from 'react-icons/hi2';
import api from '../api/axios';

const AnnouncementsBoard = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/account/announcements').then(res => setItems(res.data)).catch(() => {});
  }, []);

  if (!items.length) return null;

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
        <HiOutlineMegaphone className="w-5 h-5 text-brand-600" />
        <h3 className="text-lg font-medium text-gray-900">Announcements</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map(a => (
          <li key={a.id} className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {a.pinned && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">Pinned</span>}
              <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
              <span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{a.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AnnouncementsBoard;
