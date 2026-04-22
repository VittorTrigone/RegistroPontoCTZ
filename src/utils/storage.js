export const STORAGE_KEYS = {
  USERS: '@facepoint:users',
  TIME_LOGS: '@facepoint:time_logs',
  CURRENT_USER: '@facepoint:current_user',
};

// Seed initial admin user and totem account if not exists
export const initializeStorage = () => {
  const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  let users = usersStr ? JSON.parse(usersStr) : [];
  
  const hasAdmin = users.some(u => u.role === 'admin');
  const hasTotem = users.some(u => u.role === 'totem');

  let updatedUsers = [...users];

  if (!hasAdmin) {
    updatedUsers.push({
      id: 'admin_001',
      name: 'Administrador (RH)',
      email: 'admin@facepoint.com',
      role: 'admin',
      password: 'admin',
      hasBiometrics: false,
      biometricDescriptor: null,
    });
  }

  if (!hasTotem) {
    updatedUsers.push({
      id: 'totem_001',
      name: 'Relógio Totem',
      email: 'totem@facepoint.com',
      role: 'totem',
      password: 'totem', // In real life, just a simple pin/password
      hasBiometrics: false,
      biometricDescriptor: null,
    });
  }

  if (!usersStr || !hasAdmin || !hasTotem) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
  }
  
  const logs = localStorage.getItem(STORAGE_KEYS.TIME_LOGS);
  if (!logs) {
    localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify([]));
  }
};

export const getStorageData = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

export const setStorageData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};
