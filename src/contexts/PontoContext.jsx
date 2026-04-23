import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { format } from 'date-fns';

const PontoContext = createContext({});

export const usePonto = () => useContext(PontoContext);

export const PontoProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const { data: timeLogs, error: logError } = await supabase
        .from('time_logs')
        .select('*');
      if (logError) throw logError;
      if (timeLogs) setLogs(timeLogs);
      
      const { data: allUsers, error: userError } = await supabase
        .from('users')
        .select('*');
      if (userError) throw userError;
      
      if (allUsers) {
        const filtered = allUsers.filter(u => u.role !== 'admin' && u.role !== 'totem' && u.role !== 'superadmin');
        console.log("Funcionários atualizados:", filtered.length);
        setEmployees(filtered);
      }
    } catch (err) {
      console.error("Erro ao atualizar dados:", err);
    }
  }, []);

  const addEmployee = async (employeeData) => {
    const id = `emp_${Date.now()}`;
    const newEmployee = {
      id,
      email: `${id}@facepoint.local`,
      password: id,
      ...employeeData,
      role: 'employee',
      hasBiometrics: false,
      biometricDescriptors: [],
    };
    
    const { error } = await supabase.from('users').insert([newEmployee]);
    if (error) {
      console.error("Erro ao adicionar:", error);
      alert("Erro ao adicionar funcionário no banco de dados.");
      return null;
    }
    
    await refreshData();
    return newEmployee;
  };
  
  const editEmployee = async (id, newProps) => {
    const { error } = await supabase.from('users').update(newProps).eq('id', id);
    if (error) {
      console.error("Erro ao editar funcionário:", error);
      throw error;
    }
    await refreshData();
  }

  const deleteEmployee = async (id) => {
    await supabase.from('users').delete().eq('id', id);
    await refreshData();
  }

  const logTime = async (userId, type, coords) => {
    // SECURITY: Anti-Spam (5 minutes debounce)
    const { data: userLogs } = await supabase
      .from('time_logs')
      .select('*')
      .eq('userId', userId)
      .order('timestamp', { ascending: false });
    
    if (userLogs && userLogs.length > 0) {
      const lastTime = new Date(userLogs[0].timestamp);
      const diffMs = Math.abs(new Date() - lastTime); 
      // 5 minutes = 300,000 ms
      // Add a 10-second margin minimum so they aren't blocked by double-clicks
      if (diffMs < 300000) {
        return { success: false, message: 'Falta menos de 5 Minutos desde a última marcação.' };
      }
    }

    const newLog = {
      id: `log_${Date.now()}`,
      userId,
      type, 
      timestamp: new Date().toISOString(),
      dateStr: format(new Date(), 'yyyy-MM-dd'),
      coords,
      manual: false
    };
    
    const { error } = await supabase.from('time_logs').insert([newLog]);
    
    if (error) {
       console.error("Erro ao registrar ponto:" , error);
       return { success: false, message: 'Erro no servidor' };
    }
    
    await refreshData();
    return { success: true, log: newLog };
  };
  
  const editLogTime = async (logId, newTimestamp) => {
    await supabase.from('time_logs').update({ timestamp: newTimestamp, manual: true }).eq('id', logId);
    await refreshData();
  }

  const deleteLog = async (logId) => {
    await supabase.from('time_logs').delete().eq('id', logId);
    await refreshData();
  }

  const addManualLog = async (userId, type, datetime) => {
    const newLog = {
      id: `log_${Date.now()}_manual`,
      userId,
      type, 
      timestamp: new Date(datetime).toISOString(),
      dateStr: format(new Date(datetime), 'yyyy-MM-dd'),
      coords: null,
      manual: true
    };
    await supabase.from('time_logs').insert([newLog]);
    await refreshData();
  }

  const getUserLogs = (userId) => {
    return logs.filter(l => l.userId === userId).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  };
  
  const getTodayLogs = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return logs.filter(l => l.dateStr === todayStr).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  return (
    <PontoContext.Provider value={{ 
      logs, employees, addEmployee, editEmployee, deleteEmployee, logTime, getUserLogs, getTodayLogs, editLogTime, deleteLog, addManualLog, refreshData 
    }}>
      {children}
    </PontoContext.Provider>
  );
};
