import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whlgelcizjrdmhoajhni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobGdlbGNpempyZG1ob2FqaG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTg2NTAsImV4cCI6MjA5MjM5NDY1MH0.8r4wOg2Dhnb2qpYrpjEdykOCzg-aJKAAYhztdX58BUM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: adminUser } = await supabase.from('users').select('*').eq('email', 'vi.trigone@gmail.com.adm').single();
  
  if (adminUser) {
    const currentWorkSchedule = adminUser.work_schedule || {};
    const newSettingsPayload = {
       tolerance_enabled: true,
       tolerance_minutes: 15,
       global_holidays: [{ date: '2026-05-26', name: 'Feriado de Teste DB' }]
    };
    
    const { error: updateError } = await supabase.from('users').update({
      work_schedule: {
         ...currentWorkSchedule,
         company_settings: newSettingsPayload
      }
    }).eq('id', adminUser.id);
    
    console.log('Update Error:', updateError);
    
    const { data: readBack } = await supabase.from('users').select('work_schedule').eq('id', adminUser.id).single();
    console.log('Read Back:', JSON.stringify(readBack.work_schedule.company_settings));
  }
}
test();
