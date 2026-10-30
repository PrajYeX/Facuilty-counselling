import { useContext } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { homeFor } from '../utils/roles';

const links = [
  { to: '/cutoffs', label: 'Seat Matrix & Cutoffs' },
  { to: '/rank-lookup', label: 'Rank Lookup' }
];

// Header for pages anyone can open without signing in.
const PublicLayout = ({ children }) => {
  const { user } = useContext(AuthContext);
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-brand-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-lg font-bold text-white">Faculty Counselling System</Link>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'text-white font-semibold' : 'text-brand-100 hover:text-white')}>
                {l.label}
              </NavLink>
            ))}
            <Link to={user ? homeFor(user.role) : '/'} className="px-3 py-1.5 rounded-md bg-white text-brand-700 font-medium">
              {user ? 'My dashboard' : 'Sign in'}
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
};

export default PublicLayout;
