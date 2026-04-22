import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStorageData, setStorageData, STORAGE_KEYS, initializeStorage } from '../utils/storage';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeStorage();
    const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER);
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const foundUser = users.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      setUser(foundUser);
      setStorageData(STORAGE_KEYS.CURRENT_USER, foundUser);
      return { success: true, user: foundUser };
    }
    return { success: false, message: 'Credenciais inválidas' };
  };

  const logout = () => {
    setUser(null);
    setStorageData(STORAGE_KEYS.CURRENT_USER, null);
  };
  
  const updateUser = (updatedData) => {
    const users = getStorageData(STORAGE_KEYS.USERS);
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, ...updatedData } : u);
    setStorageData(STORAGE_KEYS.USERS, updatedUsers);
    
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    setStorageData(STORAGE_KEYS.CURRENT_USER, newUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
