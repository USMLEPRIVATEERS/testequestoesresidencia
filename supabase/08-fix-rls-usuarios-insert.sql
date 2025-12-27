-- ============================================
-- CORREÇÃO: ADICIONAR POLÍTICA RLS DE INSERT PARA USUARIOS
-- ============================================

-- Este script corrige o problema de Row Level Security que impede
-- a criação de novos usuários durante o signup.

-- PROBLEMA: O arquivo 03-row-level-security.sql não incluiu uma
-- política de INSERT para a tabela usuarios, causando erro 403.

-- SOLUÇÃO: Adicionar política que permite INSERT durante signup.

-- ====== REMOVER POLÍTICA ANTIGA SE EXISTIR ======
DROP POLICY IF EXISTS "Usuarios podem criar sua propria conta" ON usuarios;
DROP POLICY IF EXISTS "Permitir insercao durante signup" ON usuarios;
DROP POLICY IF EXISTS "Usuarios podem inserir seus proprios dados" ON usuarios;

-- ====== CRIAR NOVA POLÍTICA DE INSERT ======
-- Esta política permite que um usuário recém-autenticado insira seu próprio registro
-- O auth.uid() retorna o ID do usuário que acabou de fazer signUp
CREATE POLICY "Usuarios podem criar sua propria conta"
ON usuarios FOR INSERT
WITH CHECK (auth.uid() = id);

-- ====== POLÍTICA ADICIONAL: LEITURA PÚBLICA DE NOMES (PARA RANKING) ======
-- Precisamos permitir que usuários vejam os nomes de outros usuários no ranking
-- Vamos atualizar a política de SELECT para ser mais permissiva

-- Remover política antiga de SELECT se existir
DROP POLICY IF EXISTS "Usuarios podem ler seus proprios dados" ON usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados podem ler dados basicos" ON usuarios;

-- Nova política: usuários autenticados podem ler dados básicos de todos os usuários
-- (necessário para o ranking funcionar)
CREATE POLICY "Usuarios autenticados podem ler dados basicos"
ON usuarios FOR SELECT
TO authenticated
USING (true);

-- NOTA: Isso permite que usuários autenticados vejam nome, instagram, etc de outros usuários
-- O que é necessário para o ranking funcionar. Dados sensíveis como email
-- devem ser protegidos no nível de aplicação (não retornar em queries públicas)

-- ====== VERIFICAÇÃO ======
DO $$
DECLARE
    insert_policy_exists BOOLEAN;
    select_policy_exists BOOLEAN;
BEGIN
    -- Verificar se a política de INSERT existe
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'usuarios'
        AND policyname = 'Usuarios podem criar sua propria conta'
    ) INTO insert_policy_exists;

    -- Verificar se a política de SELECT existe
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'usuarios'
        AND policyname = 'Usuarios autenticados podem ler dados basicos'
    ) INTO select_policy_exists;

    -- Relatório
    IF insert_policy_exists THEN
        RAISE NOTICE '✓ Política de INSERT criada com sucesso';
    ELSE
        RAISE EXCEPTION 'ERRO: Política de INSERT não foi criada';
    END IF;

    IF select_policy_exists THEN
        RAISE NOTICE '✓ Política de SELECT atualizada com sucesso';
    ELSE
        RAISE EXCEPTION 'ERRO: Política de SELECT não foi criada';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS configurado corretamente!';
    RAISE NOTICE 'Agora você pode criar contas sem erros.';
    RAISE NOTICE '========================================';
END $$;

-- ====== LISTAR TODAS AS POLÍTICAS DA TABELA USUARIOS ======
-- Execute esta query separadamente para ver todas as políticas ativas:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'usuarios';
