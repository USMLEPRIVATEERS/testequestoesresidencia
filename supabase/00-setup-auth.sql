-- ============================================
-- CONFIGURAÇÃO INICIAL DE AUTENTICAÇÃO
-- ============================================

-- NOTA: Este arquivo contém configurações que devem ser feitas através da interface
-- do Supabase, não via SQL. São instruções de referência.

-- ============================================
-- CONFIGURAÇÕES NO PAINEL DO SUPABASE
-- ============================================

/*
1. HABILITAR AUTENTICAÇÃO POR EMAIL
   - Vá em: Authentication > Providers
   - Habilite: Email
   - Configurações recomendadas:
     * Enable Email Signup: SIM
     * Enable Email Confirmations: NÃO (para facilitar testes iniciais)
     * Minimum Password Length: 6

2. CONFIGURAR URL DE SITE (opcional)
   - Vá em: Authentication > URL Configuration
   - Site URL: http://localhost:8000 (para desenvolvimento local)
   - Adicione suas URLs de produção quando hospedar

3. DESABILITAR CONFIRMAÇÃO DE EMAIL (para testes)
   - Vá em: Authentication > Email Templates
   - Você pode personalizar os templates de email

4. VERIFICAR POLÍTICAS DE SENHA
   - Senha mínima: 6 caracteres (padrão)
   - Você pode aumentar para produção
*/

-- ============================================
-- TRIGGER PARA SINCRONIZAR AUTH.USERS COM USUARIOS
-- ============================================

-- Esta função cria automaticamente um registro na tabela 'usuarios'
-- quando um novo usuário se registra via Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nome, data_criacao)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', SPLIT_PART(NEW.email, '@', 1)),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que executa a função acima
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- IMPORTANTE: STORAGE (caso queira adicionar imagens futuramente)
-- ============================================

/*
Se você quiser adicionar imagens às questões no futuro:

1. Crie um bucket no Supabase Storage:
   - Vá em: Storage > Create bucket
   - Nome: 'questoes-imagens'
   - Public: NÃO (se quiser controlar acesso)

2. Configure políticas de acesso ao bucket
*/

-- Exemplo de políticas de Storage (caso crie o bucket)
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('questoes-imagens', 'questoes-imagens', false);
--
-- CREATE POLICY "Usuarios podem ver imagens de questoes"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'questoes-imagens');
--
-- CREATE POLICY "Apenas admins podem fazer upload"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'questoes-imagens' AND auth.uid() IN (
--     SELECT id FROM usuarios WHERE email = 'admin@exemplo.com'
-- ));

-- ============================================
-- FUNÇÕES AUXILIARES PARA ADMIN
-- ============================================

-- Função para resetar senha de um usuário (uso administrativo)
-- NOTA: Execute isso apenas via service_role, não via cliente

CREATE OR REPLACE FUNCTION admin_reset_user_password(user_email TEXT, new_password TEXT)
RETURNS void AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Buscar ID do usuário
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = user_email;

    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;

    -- Atualizar senha (isso só funciona com service_role key)
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICAÇÃO DE INTEGRIDADE
-- ============================================

-- Query para verificar se tudo está configurado corretamente
-- Execute isso após configurar tudo

DO $$
BEGIN
    -- Verificar se tabelas existem
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usuarios') THEN
        RAISE NOTICE 'ATENÇÃO: Tabela usuarios não existe!';
    ELSE
        RAISE NOTICE 'OK: Tabela usuarios existe';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questoes') THEN
        RAISE NOTICE 'ATENÇÃO: Tabela questoes não existe!';
    ELSE
        RAISE NOTICE 'OK: Tabela questoes existe';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'testes') THEN
        RAISE NOTICE 'ATENÇÃO: Tabela testes não existe!';
    ELSE
        RAISE NOTICE 'OK: Tabela testes existe';
    END IF;

    -- Verificar se RLS está habilitado
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'usuarios'
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'ATENÇÃO: RLS não está habilitado na tabela usuarios!';
    ELSE
        RAISE NOTICE 'OK: RLS habilitado na tabela usuarios';
    END IF;

    RAISE NOTICE 'Verificação de integridade concluída!';
END $$;
