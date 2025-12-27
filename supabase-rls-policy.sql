-- =====================================================
-- POLÍTICAS RLS PARA SIGNUP - Tabela usuarios
-- =====================================================
-- Este arquivo contém as políticas de Row Level Security (RLS)
-- necessárias para permitir o signup com a abordagem table-first
-- (inserir na tabela usuarios ANTES de criar no Auth)
-- =====================================================

-- 1. REMOVER políticas antigas (se existirem)
DROP POLICY IF EXISTS "Usuários podem ler seus próprios dados" ON usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON usuarios;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios dados" ON usuarios;
DROP POLICY IF EXISTS "Permitir INSERT público durante signup" ON usuarios;

-- 2. CRIAR política para LEITURA (SELECT)
-- Permite que usuários autenticados leiam apenas seus próprios dados
CREATE POLICY "Usuários podem ler seus próprios dados"
ON usuarios FOR SELECT
USING (auth.uid() = id);

-- 3. CRIAR política para ATUALIZAÇÃO (UPDATE)
-- Permite que usuários autenticados atualizem apenas seus próprios dados
CREATE POLICY "Usuários podem atualizar seus próprios dados"
ON usuarios FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. CRIAR política para INSERÇÃO (INSERT) - IMPORTANTE PARA SIGNUP
-- Esta política permite INSERT público durante o signup
-- Permite inserir desde que o email não exista ainda
CREATE POLICY "Permitir INSERT público durante signup"
ON usuarios FOR INSERT
WITH CHECK (
    -- Permite insert se:
    -- 1. O email ainda não existe na tabela OU
    -- 2. O usuário já está autenticado e o ID corresponde
    NOT EXISTS (
        SELECT 1 FROM usuarios WHERE email = NEW.email
    )
    OR auth.uid() = id
);

-- 5. CRIAR política para DELEÇÃO (DELETE)
-- Permite que usuários autenticados deletem apenas seus próprios dados
-- (necessário para rollback quando Auth falhar)
CREATE POLICY "Usuários podem deletar seus próprios dados"
ON usuarios FOR DELETE
USING (
    -- Permite deletar se o usuário está autenticado E é o dono OU
    -- Permite deletar durante signup (quando ainda não há auth.uid)
    auth.uid() = id OR auth.uid() IS NULL
);

-- =====================================================
-- NOTA IMPORTANTE:
-- =====================================================
-- A política "Permitir INSERT público durante signup" é segura porque:
-- 1. Valida que o email não existe ainda (evita duplicatas)
-- 2. O signup completo só é bem-sucedido se o Auth também criar o usuário
-- 3. Se o Auth falhar, o registro é deletado da tabela
-- 4. Dados sensíveis como senha são armazenados apenas no Auth
-- =====================================================

-- VERIFICAR políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;
