-- ============================================
-- TRIGGER AUTOMÁTICO PARA CRIAR USUÁRIOS
-- ============================================
-- Este trigger resolve o problema de sincronização entre
-- Supabase Auth e a tabela usuarios
--
-- EXECUTE NO SQL EDITOR DO SUPABASE
-- (Supabase Dashboard → SQL Editor → New Query)
-- ============================================

-- 1. Criar função que será executada quando um usuário for criado no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  user_whatsapp TEXT;
BEGIN
  -- Extrair nome e whatsapp do metadata (se disponível)
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    'Novo Usuário'
  );

  user_whatsapp := COALESCE(
    NEW.raw_user_meta_data->>'whatsapp',
    NEW.raw_user_meta_data->>'phone',
    NULL
  );

  -- Inserir novo usuário na tabela usuarios
  INSERT INTO public.usuarios (
    id,
    email,
    nome,
    whatsapp,
    plano,
    questoes_respondidas_hoje,
    provas_selecionadas,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_whatsapp,
    'free',                    -- Plano padrão
    0,                         -- Questões hoje
    ARRAY[]::text[],          -- Array vazio de provas
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Se já existir, atualizar email (caso tenha mudado)
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Log para debug (opcional)
  RAISE NOTICE 'Novo usuário criado: % (%), whatsapp: %', user_name, NEW.email, user_whatsapp;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Criar trigger que executa a função após inserção de usuário no Auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. (OPCIONAL) Criar trigger para atualização de email
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar email na tabela usuarios quando mudar no Auth
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.usuarios
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Para verificar se os triggers foram criados com sucesso:

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- ============================================
-- TESTE
-- ============================================
-- Para testar, crie um novo usuário via signup e verifique:

-- SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 1;
-- SELECT * FROM usuarios ORDER BY created_at DESC LIMIT 1;

-- Os IDs devem ser iguais e o registro deve ter sido criado automaticamente!
