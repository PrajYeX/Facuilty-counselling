import { HiOutlineAcademicCap } from 'react-icons/hi2';

// Centered card used by sign-in, registration and account-recovery pages.
const AuthShell = ({ title, subtitle = 'Faculty Counselling System', children, footer }) => (
  <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="flex justify-center text-brand-600">
        <HiOutlineAcademicCap className="w-16 h-16" />
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{title}</h2>
      <p className="mt-2 text-center text-sm text-gray-600">{subtitle}</p>
    </div>
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-100">
        {children}
      </div>
      {footer && <div className="mt-6 text-center text-sm text-gray-600">{footer}</div>}
    </div>
  </div>
);

export default AuthShell;
