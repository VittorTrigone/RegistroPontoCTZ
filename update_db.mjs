import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whlgelcizjrdmhoajhni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobGdlbGNpempyZG1ob2FqaG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTg2NTAsImV4cCI6MjA5MjM5NDY1MH0.8r4wOg2Dhnb2qpYrpjEdykOCzg-aJKAAYhztdX58BUM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: adminUser } = await supabase.from('users').select('*').eq('email', 'vi.trigone@gmail.com.adm').single();
  
  if (adminUser) {
    const { data, error } = await supabase.from('users').update({
      work_schedule: {
         global_holidays: [{ date: '2026-05-26', name: 'Teste' }]
      }
    }).eq('id', adminUser.id);
    
    console.log('Update Error:', error);
    
    const { data: updated } = await supabase.from('users').select('work_schedule').eq('id', adminUser.id).single();
    console.log('Updated Schedule:', updated);
  }
}
test();
