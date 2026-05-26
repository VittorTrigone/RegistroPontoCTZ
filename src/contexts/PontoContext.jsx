import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { format } from 'date-fns';
import { useAuth } from './AuthContext';

const PontoContext = createContext({});

export const usePonto = () => useContext(PontoContext);

export const PontoProvider = ({ children }) => {
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('@nponto:logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('@nponto:employees');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [companySettings, setCompanySettings] = useState(() => {
    const saved = localStorage.getItem('@n-ponto:company_settings');
    return saved ? JSON.parse(saved) : {
      tolerance_enabled: true,
      tolerance_minutes: 10,
      global_holidays: []
    };
  });
  
  // Persist core data for true offline booting
  useEffect(() => {
    localStorage.setItem('@nponto:logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('@nponto:employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('@nponto:companySettings', JSON.stringify(companySettings));
  }, [companySettings]);
  
  // Offline logs state
  const [offlineLogs, setOfflineLogs] = useState(() => {
    const saved = localStorage.getItem('@nponto:offlineLogs');
    return saved ? JSON.parse(saved) : [];
  });

  const { user, updateUser } = useAuth();
  const isSyncing = React.useRef(false);

  // Persist offline logs automatically when changed
  useEffect(() => {
    localStorage.setItem('@nponto:offlineLogs', JSON.stringify(offlineLogs));
  }, [offlineLogs]);

  const syncOfflineLogs = useCallback(async () => {
    if (!navigator.onLine || offlineLogs.length === 0 || isSyncing.current) return;
    
    isSyncing.current = true;
    console.log('Iniciando sincronização de pontos offline...', offlineLogs.length);
    const toSync = [...offlineLogs];

    // Try to UPSERT all offline logs (solves duplication and stuck logs if background insert succeeded)
    const { error } = await supabase.from('time_logs').upsert(toSync, { onConflict: 'id' });
    
    if (!error) {
      console.log('Sincronização concluída com sucesso!');
      setOfflineLogs(prev => prev.filter(log => !toSync.find(t => t.id === log.id)));
      
      // Move them directly to the main logs state so the UI updates in real-time
      setLogs(prevLogs => {
        const updated = [...prevLogs];
        toSync.forEach(log => {
          if (!updated.find(l => l.id === log.id)) {
             updated.push(log);
          }
        });
        return updated;
      });

      // Background refresh to catch anything else
      refreshData();
    } else {
      console.error('Erro na sincronização offline:', error);
      // If it's a duplicate key error that somehow wasn't caught by upsert, still clear it
      if (error.code === '23505') {
         setOfflineLogs(prev => prev.filter(log => !toSync.find(t => t.id === log.id)));
         
         setLogs(prevLogs => {
            const updated = [...prevLogs];
            toSync.forEach(log => {
              if (!updated.find(l => l.id === log.id)) {
                 updated.push(log);
              }
            });
            return updated;
         });
      }
    }
    isSyncing.current = false;
  }, [offlineLogs]);

  // Listen for online events
  useEffect(() => {
    window.addEventListener('online', syncOfflineLogs);
    return () => window.removeEventListener('online', syncOfflineLogs);
  }, [syncOfflineLogs]);

  const refreshData = useCallback(async () => {
    if (!user || user.role === 'superadmin') return;

    const baseEmail = user.email.replace('.adm', '').replace('.totem', '');

    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .like('email', `%@${baseEmail}`)
      .neq('id', `cache_${Date.now()}`); // Bypass mobile cache
      
    if (usersError || !allUsers) return; // Do not wipe state on network error
    
    // Extract company settings from admin user
    const adminUser = allUsers.find(u => u.role === 'admin' || u.email.endsWith('.adm'));
    if (adminUser) {
      setCompanySettings(prev => ({
        ...prev,
        tolerance_enabled: adminUser.tolerance_enabled ?? true,
        tolerance_minutes: adminUser.tolerance_minutes ?? 10,
        global_holidays: adminUser.work_schedule?.global_holidays || []
      }));
    }
    
    const filteredEmployees = allUsers.filter(u => u.role !== 'admin' && u.role !== 'totem' && u.role !== 'superadmin');
    setEmployees(filteredEmployees);
    
    const employeeIds = filteredEmployees.map(e => e.id);
    
    if (employeeIds.length > 0) {
      const { data: timeLogs, error: logsError } = await supabase
        .from('time_logs')
        .select('*')
        .in('userId', employeeIds)
        .neq('id', `cache_${Date.now()}`); // Bypass mobile cache
        
      if (!logsError && timeLogs) {
        setLogs(timeLogs);
      }
    } else {
      setLogs([]);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
    
    // Auto-refresh (Polling) a cada 15 segundos para manter as telas sincronizadas
    const interval = setInterval(() => {
       refreshData();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [refreshData]);

  const addEmployee = async (employeeData) => {
    if (!user) return;
    const baseEmail = user.email.replace('.adm', '').replace('.totem', '');
    const id = `emp_${Date.now()}`;
    const newEmployee = {
      id,
      email: `${id}@${baseEmail}`,
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
    // Optimistic update - UI updates instantly
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...newProps } : emp));
    await supabase.from('users').update(newProps).eq('id', id);
    refreshData(); // Sync in background, no await
  }

  const updateCompanySettings = async (newSettings) => {
    const merged = { ...companySettings, ...newSettings };
    setCompanySettings(merged); // Optimistic
    localStorage.setItem('@n-ponto:company_settings', JSON.stringify(merged));
    
    // Save to admin user record in DB
    if (user) {
      const currentWorkSchedule = user.work_schedule || {};
      
      await supabase.from('users').update({
        tolerance_enabled: merged.tolerance_enabled,
        tolerance_minutes: merged.tolerance_minutes,
        work_schedule: {
           ...currentWorkSchedule,
           global_holidays: merged.global_holidays || []
        }
      }).eq('id', user.id);
      
      // Update local auth user cache
      if (updateUser) {
        await updateUser({
          tolerance_enabled: merged.tolerance_enabled,
          tolerance_minutes: merged.tolerance_minutes,
          work_schedule: {
             ...currentWorkSchedule,
             global_holidays: merged.global_holidays || []
          }
        });
      }
    }
  };

  const deleteEmployee = async (id) => {
    await supabase.from('users').delete().eq('id', id);
    await refreshData();
  }

  const logTime = async (userId, type, coords) => {
    // SECURITY: Anti-Spam (5 minutes debounce)
    // Check locally instead of fetching from Supabase to prevent offline hang
    const allUserLogs = [...logs, ...offlineLogs]
       .filter(l => l.userId === userId)
       .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (allUserLogs.length > 0) {
      const lastTime = new Date(allUserLogs[0].timestamp);
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
    
    // OFFLINE HANDLING
    if (!navigator.onLine) {
       setOfflineLogs(prev => [...prev, newLog]);
       return { success: true, log: newLog, isOffline: true };
    }

    // Force a 5 second timeout on the fetch so it doesn't hang forever
    const insertPromise = supabase.from('time_logs').insert([newLog]);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ error: { message: 'Network Timeout' } }), 5000));
    
    const { error } = await Promise.race([insertPromise, timeoutPromise]);
    
    if (error) {
       // Se o erro for de conexão/rede ou timeout, salva offline
       if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network') || error.message.includes('Timeout'))) {
          setOfflineLogs(prev => [...prev, newLog]);
          return { success: true, log: newLog, isOffline: true };
       }
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
      logs, employees, companySettings, addEmployee, editEmployee, deleteEmployee, logTime, getUserLogs, getTodayLogs, editLogTime, deleteLog, addManualLog, refreshData, updateCompanySettings, offlineLogs, syncOfflineLogs 
    }}>
      {children}
    </PontoContext.Provider>
  );
};
