import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://whlgelcizjrdmhoajhni.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobGdlbGNpempyZG1ob2FqaG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTg2NTAsImV4cCI6MjA5MjM5NDY1MH0.8r4wOg2Dhnb2qpYrpjEdykOCzg-aJKAAYhztdX58BUM');
async function run() {
  const { error } = await supabase.rpc('run_sql', {
    sql_query: `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS work_start_time VARCHAR DEFAULT '09:00',
      ADD COLUMN IF NOT EXISTS work_end_time VARCHAR DEFAULT '18:00',
      ADD COLUMN IF NOT EXISTS work_lunch_duration INT DEFAULT 60,
      ADD COLUMN IF NOT EXISTS work_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb;
    `
  });
  console.log('Result:', error);
}
run();
