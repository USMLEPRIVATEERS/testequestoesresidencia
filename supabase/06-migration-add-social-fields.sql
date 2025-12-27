-- ============================================
-- MIGRAÇÃO: ADICIONAR CAMPOS SOCIAIS (WHATSAPP E INSTAGRAM)
-- ============================================

-- Este script adiciona os campos de WhatsApp e Instagram à tabela usuarios
-- Execute este script para atualizar o banco de dados existente

-- Adicionar coluna de WhatsApp
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

-- Adicionar coluna de Instagram
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);

-- Adicionar constraint para validar formato do WhatsApp (formato internacional)
-- Formato: +5511999999999 (código do país + DDD + número)
ALTER TABLE usuarios
ADD CONSTRAINT whatsapp_valido CHECK (
    whatsapp IS NULL OR
    whatsapp ~* '^\+[0-9]{12,15}$'
);

-- Adicionar constraint para validar Instagram (sem @ no início)
ALTER TABLE usuarios
ADD CONSTRAINT instagram_valido CHECK (
    instagram IS NULL OR
    (instagram ~* '^[a-zA-Z0-9._]{1,30}$' AND instagram !~ '^[._]')
);

-- Criar índice para buscar usuários pelo Instagram
CREATE INDEX IF NOT EXISTS idx_usuarios_instagram ON usuarios(instagram);

-- Comentários explicativos
COMMENT ON COLUMN usuarios.whatsapp IS
'WhatsApp no formato internacional: +5511999999999 (código do país + DDD + número)';

COMMENT ON COLUMN usuarios.instagram IS
'Nome de usuário do Instagram (sem @). Exemplo: joaosilva123';

-- Verificar se as colunas foram adicionadas
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'usuarios'
        AND column_name = 'whatsapp'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'usuarios'
        AND column_name = 'instagram'
    ) THEN
        RAISE NOTICE 'Sucesso! Colunas whatsapp e instagram adicionadas à tabela usuarios';
    ELSE
        RAISE EXCEPTION 'Erro: Colunas não foram adicionadas corretamente';
    END IF;
END $$;
