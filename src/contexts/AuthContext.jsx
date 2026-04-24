import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('@facepoint:current_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data: foundUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .neq('id', `cache_${Date.now()}`) // Bypass mobile cache
      .single();
    
    if (foundUser && !error) {
      setUser(foundUser);
      localStorage.setItem('@facepoint:current_user', JSON.stringify(foundUser));
      return { success: true, user: foundUser };
    }
    return { success: false, message: 'Credenciais inválidas' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('@facepoint:current_user');
  };
  
  const updateUser = async (updatedData) => {
    const { data, error } = await supabase
      .from('users')
      .update(updatedData)
      .eq('id', user.id)
      .select()
      .single();
      
    if (data && !error) {
      setUser(data);
      localStorage.setItem('@facepoint:current_user', JSON.stringify(data));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
