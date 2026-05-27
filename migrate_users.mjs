import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carregar variáveis do .env localmente
const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function migrate() {
  console.log("Iniciando migração de usuários antigos para o Supabase Auth...");
  
  const { data: users, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error("Erro ao buscar usuários:", error);
    return;
  }
  
  console.log(`Encontrados ${users.length} usuários. Migrando...`);
  
  for (const user of users) {
    console.log(`- Criando Auth para: ${user.email}`);
    
    // Tentamos fazer o signUp. Se já existir, ele retorna erro ou ignora, o que é seguro.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password
    });
    
    if (authError) {
       console.error(`  Erro (${user.email}): ${authError.message}`);
    } else {
       console.log(`  Sucesso: ${user.email}`);
    }
  }
  
  // Criar o usuário do totem
  console.log("Criando conta de sistema do Totem...");
  const totemEmail = 'totem@totem.com';
  const totemPassword = 'totempassword123';
  
  const { error: totemAuthError } = await supabase.auth.signUp({
     email: totemEmail,
     password: totemPassword
  });
  
  if (totemAuthError) {
     console.error("Erro Totem Auth:", totemAuthError.message);
  } else {
     // Inserir totem na tabela public caso não exista
     const { data: existingTotem } = await supabase.from('users').select('id').eq('email', totemEmail).single();
     if (!existingTotem) {
        await supabase.from('users').insert([{
           name: 'Totem',
           email: totemEmail,
           password: totemPassword,
           role: 'totem'
        }]);
     }
     console.log("Totem configurado com sucesso.");
  }
  
  console.log("Migração concluída!");
}

migrate();
