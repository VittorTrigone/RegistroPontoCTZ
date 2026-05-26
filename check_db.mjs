import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whlgelcizjrdmhoajhni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobGdlbGNpempyZG1ob2FqaG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTg2NTAsImV4cCI6MjA5MjM5NDY1MH0.8r4wOg2Dhnb2qpYrpjEdykOCzg-aJKAAYhztdX58BUM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('users').select('email, role, work_schedule').eq('role', 'admin');
  console.log('Admins:', JSON.stringify(data, null, 2));
}
test();
