import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { HiOutlineLogout, HiUserCircle } from 'react-icons/hi';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-brand-600 border-b border-brand-700 z-10 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 gap-2">
          <div className="flex items-center min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-white tracking-wide truncate">
              Faculty Counselling<span className="hidden sm:inline"> System</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {user && (
              <>
                <NotificationBell />
                <div className="flex items-center text-brand-100">
                  <HiUserCircle className="w-6 h-6 mr-2" />
                  <span className="font-medium hidden md:inline">{user.name}</span>
                  <span className="ml-2 hidden sm:inline px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-800 text-brand-100 uppercase">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-md text-brand-200 hover:text-white hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-600 focus:ring-white"
                  title="Logout"
                >
                  <HiOutlineLogout className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
