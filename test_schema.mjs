import { createClient } from '@supabase/supabase-js';

// Copiando as credenciais do supabase do arquivo PontoContext ou AuthContext
const supabase = createClient('https://whlgelcizjrdmhoajhni.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobGdlbGNpempyZG1ob2FqaG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg0NDU2ODMsImV4cCI6MjAyNDAyMTY4M30.z8uP99R8wV6XQ_p-3-t-T_a8_z-X_5xX-M-_Z_-v_-k');

async function test() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log('Columns:', Object.keys(data[0]));
}
test();
