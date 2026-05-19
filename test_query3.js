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
  const baseEmail = 'vi.trigone@gmail.com';
  const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .like('email', `%@${baseEmail}`)
      .neq('id', `cache_${Date.now()}`);

  console.log("ERROR:", error);
  console.log("USERS FETCHED:", users ? users.length : 0);
}

run();
