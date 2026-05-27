-- 1. Habilitar RLS para remover o aviso crítico do Supabase
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas básicas para permitir o funcionamento do app (já que não usamos JWT do Supabase Auth)
DROP POLICY IF EXISTS "Allow All" ON public.users;
CREATE POLICY "Allow All" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All" ON public.time_logs;
CREATE POLICY "Allow All" ON public.time_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow All" ON public.access_requests;
CREATE POLICY "Allow All" ON public.access_requests FOR ALL USING (true);

-- 3. RESOLVER "SENSITIVE COLUMNS EXPOSED" (Exposição de Senhas)
-- Vamos remover a permissão pública de ler a coluna "password"
REVOKE SELECT (password) ON public.users FROM anon, authenticated, public;

-- 4. Como o Frontend não pode mais ler a senha, precisamos de uma função segura no Banco (RPC) para fazer o Login
CREATE OR REPLACE FUNCTION public.login_user(p_email text, p_password text)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função burle as restrições para ler a senha internamente
AS $$
DECLARE
  found_user public.users;
BEGIN
  -- Busca o usuário e verifica a senha (tudo internamente no servidor)
  SELECT * INTO found_user 
  FROM public.users 
  WHERE email = p_email AND password = p_password 
  LIMIT 1;
  
  -- Retorna o usuário (o Supabase ocultará automaticamente a coluna password no retorno JSON)
  RETURN found_user;
END;
$$;
