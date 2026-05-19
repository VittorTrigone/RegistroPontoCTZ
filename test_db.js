import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/"/g, '');
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function run() {
  const { data: users } = await supabase.from('users').select('*');
  console.log("USERS:", users.map(u => ({ id: u.id, email: u.email, role: u.role })));
  const { data: logs } = await supabase.from('time_logs').select('*');
  console.log("LOGS COUNT:", logs ? logs.length : 0);
}

run();
