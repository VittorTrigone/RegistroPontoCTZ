import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStorageData, setStorageData, STORAGE_KEYS } from '../utils/storage';
import { format } from 'date-fns';

const PontoContext = createContext({});

export const usePonto = () => useContext(PontoContext);

export const PontoProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = useCallback(() => {
    const timeLogs = getStorageData(STORAGE_KEYS.TIME_LOGS) || [];
    setLogs(timeLogs);
    
    const allUsers = getStorageData(STORAGE_KEYS.USERS) || [];
    setEmployees(allUsers.filter(u => u.role !== 'admin' && u.role !== 'totem'));
  }, []);

  const addEmployee = (employeeData) => {
    const newEmployee = {
      id: `emp_${Date.now()}`,
      ...employeeData,
      role: 'employee',
      hasBiometrics: false,
      biometricDescriptors: [],
    };
    const users = getStorageData(STORAGE_KEYS.USERS) || [];
    setStorageData(STORAGE_KEYS.USERS, [...users, newEmployee]);
    refreshData();
    return newEmployee;
  };
  
  const editEmployee = (id, newProps) => {
    const users = getStorageData(STORAGE_KEYS.USERS) || [];
    const updated = users.map(u => u.id === id ? { ...u, ...newProps } : u);
    setStorageData(STORAGE_KEYS.USERS, updated);
    refreshData();
  }

  const logTime = (userId, type, coords) => {
    // SECURITY: Anti-Spam (5 minutes debounce)
    const dbLogs = getStorageData(STORAGE_KEYS.TIME_LOGS) || [];
    const userLogs = dbLogs.filter(l => l.userId === userId).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (userLogs.length > 0) {
      const lastTime = new Date(userLogs[0].timestamp);
      const diffMs = Math.abs(new Date() - lastTime); // Use absolute just in case
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
    
    setStorageData(STORAGE_KEYS.TIME_LOGS, [...dbLogs, newLog]);
    refreshData();
    return { success: true, log: newLog };
  };
  
  const editLogTime = (logId, newTimestamp) => {
    const timeLogs = getStorageData(STORAGE_KEYS.TIME_LOGS) || [];
    const updated = timeLogs.map(log => 
      log.id === logId ? { ...log, timestamp: newTimestamp, manual: true } : log
    );
    setStorageData(STORAGE_KEYS.TIME_LOGS, updated);
    refreshData();
  }

  const deleteLog = (logId) => {
    const timeLogs = getStorageData(STORAGE_KEYS.TIME_LOGS) || [];
    const updated = timeLogs.filter(log => log.id !== logId);
    setStorageData(STORAGE_KEYS.TIME_LOGS, updated);
    refreshData();
  }

  const addManualLog = (userId, type, datetime) => {
    const dbLogs = getStorageData(STORAGE_KEYS.TIME_LOGS) || [];
    const newLog = {
      id: `log_${Date.now()}_manual`,
      userId,
      type, 
      timestamp: new Date(datetime).toISOString(),
      dateStr: format(new Date(datetime), 'yyyy-MM-dd'),
      coords: null,
      manual: true
    };
    setStorageData(STORAGE_KEYS.TIME_LOGS, [...dbLogs, newLog]);
    refreshData();
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
      logs, employees, addEmployee, editEmployee, logTime, getUserLogs, getTodayLogs, editLogTime, deleteLog, addManualLog, refreshData 
    }}>
      {children}
    </PontoContext.Provider>
  );
};
