import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineAcademicCap,
  HiOutlineClipboardDocumentList,
  HiOutlineCheckBadge,
  HiOutlineListBullet,
  HiOutlineTicket,
  HiOutlineUser,
  HiOutlineDocumentArrowUp,
  HiOutlineCalendarDays,
  HiOutlineQueueList,
  HiOutlineChartBar,
  HiOutlineMegaphone,
  HiOutlineShieldCheck,
  HiOutlineCalculator,
  HiOutlineTableCells,
  HiOutlineBuildingOffice2
} from 'react-icons/hi2';

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: HiOutlineHome },
    { name: 'Colleges', path: '/admin/colleges', icon: HiOutlineAcademicCap },
    { name: 'Scoring Criteria', path: '/admin/scoring', icon: HiOutlineClipboardDocumentList },
    { name: 'Verify Faculty', path: '/admin/verify-faculty', icon: HiOutlineCheckBadge },
    { name: 'Merit List', path: '/admin/merit-list', icon: HiOutlineListBullet },
    { name: 'Schedule', path: '/admin/schedule', icon: HiOutlineCalendarDays },
    { name: 'Allotment', path: '/admin/allotment', icon: HiOutlineTicket },
    { name: 'Analytics', path: '/admin/analytics', icon: HiOutlineChartBar },
    { name: 'Announcements', path: '/admin/announcements', icon: HiOutlineMegaphone },
    { name: 'Audit Log', path: '/admin/audit-log', icon: HiOutlineShieldCheck },
  ];

  const facultyLinks = [
    { name: 'Dashboard', path: '/faculty/dashboard', icon: HiOutlineHome },
    { name: 'Profile', path: '/faculty/profile', icon: HiOutlineUser },
    { name: 'Score Breakdown', path: '/faculty/score', icon: HiOutlineCalculator },
    { name: 'Upload Documents', path: '/faculty/upload-documents', icon: HiOutlineDocumentArrowUp },
    { name: 'Option Entry', path: '/faculty/options', icon: HiOutlineQueueList },
    { name: 'Allotment Status', path: '/faculty/allotment-status', icon: HiOutlineTicket },
    { name: 'Seat Matrix & Cutoffs', path: '/cutoffs', icon: HiOutlineTableCells },
  ];

  const collegeLinks = [
    { name: 'Allotted Faculty', path: '/college/dashboard', icon: HiOutlineBuildingOffice2 },
    { name: 'Seat Matrix & Cutoffs', path: '/cutoffs', icon: HiOutlineTableCells },
  ];

  const links = { admin: adminLinks, college: collegeLinks }[user?.role] || facultyLinks;

  return (
    <div className="w-64 bg-white shadow-md min-h-screen flex flex-col hidden md:flex">
      <div className="flex-1 px-4 mt-6 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              {link.name}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
