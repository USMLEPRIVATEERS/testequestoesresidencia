-- ============================================
-- MIGRAÇÃO: CORRIGIR TABELA DE USUÁRIOS
-- ============================================

-- Este script corrige a estrutura da tabela usuarios para funcionar
-- corretamente com o Supabase Auth e adiciona campos sociais

-- IMPORTANTE: Execute este script ANTES de tentar criar novos usuários

-- 1. REMOVER coluna senha_hash (incompatível com Supabase Auth)
-- O Supabase Auth gerencia senhas automaticamente na tabela auth.users
-- Nossa tabela usuarios deve apenas referenciar o ID do usuário autenticado
ALTER TABLE usuarios
DROP COLUMN IF EXISTS senha_hash;

-- 2. ADICIONAR colunas de WhatsApp e Instagram (se não existirem)
DO $$
BEGIN
    -- Adicionar WhatsApp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN whatsapp VARCHAR(20);
    END IF;

    -- Adicionar Instagram
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'instagram'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN instagram VARCHAR(100);
    END IF;
END $$;

-- 3. ADICIONAR constraints de validação (se não existirem)
DO $$
BEGIN
    -- Constraint para WhatsApp (formato internacional)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_valido'
    ) THEN
        ALTER TABLE usuarios
        ADD CONSTRAINT whatsapp_valido CHECK (
            whatsapp IS NULL OR
            whatsapp ~* '^\+[0-9]{12,15}$'
        );
    END IF;

    -- Constraint para Instagram (sem @ no início)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'instagram_valido'
    ) THEN
        ALTER TABLE usuarios
        ADD CONSTRAINT instagram_valido CHECK (
            instagram IS NULL OR
            (instagram ~* '^[a-zA-Z0-9._]{1,30}$' AND instagram !~ '^[._]')
        );
    END IF;
END $$;

-- 4. CRIAR índice para busca por Instagram (se não existir)
CREATE INDEX IF NOT EXISTS idx_usuarios_instagram ON usuarios(instagram);

-- 5. ATUALIZAR comentários das colunas
COMMENT ON COLUMN usuarios.whatsapp IS
'WhatsApp no formato internacional: +5511999999999 (código do país + DDD + número)';

COMMENT ON COLUMN usuarios.instagram IS
'Nome de usuário do Instagram (sem @). Exemplo: joaosilva123';

COMMENT ON TABLE usuarios IS
'Tabela de dados complementares dos usuários. A autenticação é gerenciada pelo Supabase Auth (tabela auth.users). O campo id deve referenciar auth.users.id';

-- 6. VERIFICAR se as mudanças foram aplicadas
DO $$
DECLARE
    has_senha_hash BOOLEAN;
    has_whatsapp BOOLEAN;
    has_instagram BOOLEAN;
BEGIN
    -- Verificar se senha_hash foi removido
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'senha_hash'
    ) INTO has_senha_hash;

    -- Verificar se whatsapp existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'whatsapp'
    ) INTO has_whatsapp;

    -- Verificar se instagram existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'instagram'
    ) INTO has_instagram;

    -- Relatório
    IF has_senha_hash THEN
        RAISE WARNING 'ATENÇÃO: Coluna senha_hash ainda existe! Isso pode causar erros de autenticação.';
    ELSE
        RAISE NOTICE '✓ Coluna senha_hash removida com sucesso';
    END IF;

    IF has_whatsapp THEN
        RAISE NOTICE '✓ Coluna whatsapp adicionada/existente';
    ELSE
        RAISE EXCEPTION 'ERRO: Coluna whatsapp não foi adicionada';
    END IF;

    IF has_instagram THEN
        RAISE NOTICE '✓ Coluna instagram adicionada/existente';
    ELSE
        RAISE EXCEPTION 'ERRO: Coluna instagram não foi adicionada';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migração concluída com sucesso!';
    RAISE NOTICE 'A tabela usuarios está pronta para uso.';
    RAISE NOTICE '========================================';
END $$;
