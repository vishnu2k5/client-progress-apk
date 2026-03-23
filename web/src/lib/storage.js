const KEYS = {
  token: 'token',
  orgName: 'orgName',
  orgLogo: 'orgLogo',
  appLogo: 'appLogo',
};

export const getToken = () => localStorage.getItem(KEYS.token);
export const setToken = (token) => localStorage.setItem(KEYS.token, token);
export const clearAuth = () => {
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.orgName);
  localStorage.removeItem(KEYS.orgLogo);
  localStorage.removeItem(KEYS.appLogo);
};

export const isAuthed = () => !!getToken();

export const getOrgName = () => localStorage.getItem(KEYS.orgName);
export const setOrgName = (name) => localStorage.setItem(KEYS.orgName, name);

export const getOrgLogo = () => localStorage.getItem(KEYS.orgLogo) || localStorage.getItem(KEYS.appLogo);
export const setOrgLogo = (logo) => localStorage.setItem(KEYS.orgLogo, logo);
