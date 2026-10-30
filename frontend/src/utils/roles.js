export const HOME_BY_ROLE = {
  admin: '/admin/dashboard',
  faculty: '/faculty/dashboard',
  college: '/college/dashboard'
};

export const homeFor = (role) => HOME_BY_ROLE[role] || '/';
