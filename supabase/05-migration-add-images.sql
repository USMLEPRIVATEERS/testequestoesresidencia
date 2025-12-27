-- ============================================
-- MIGRAÇÃO: ADICIONAR SUPORTE A IMAGENS
-- ============================================

-- Este script adiciona a coluna de imagens à tabela questoes
-- Execute este script se você JÁ CRIOU o banco anteriormente
-- Se você está criando o banco pela primeira vez, ignore este arquivo

-- Adicionar coluna de imagens (array de URLs)
ALTER TABLE questoes
ADD COLUMN IF NOT EXISTS imagens_urls TEXT[] DEFAULT '{}';

-- Comentário explicativo
COMMENT ON COLUMN questoes.imagens_urls IS
'Array de URLs de imagens da questão. Use serviços gratuitos como Imgur (https://imgur.com), ImgBB (https://imgbb.com), ou Postimages (https://postimages.org) para hospedar as imagens. Exemplo: {''https://i.imgur.com/abc123.jpg'', ''https://i.imgur.com/def456.png''}';

-- Verificar se a coluna foi adicionada
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'questoes'
        AND column_name = 'imagens_urls'
    ) THEN
        RAISE NOTICE 'Sucesso! Coluna imagens_urls adicionada à tabela questoes';
    ELSE
        RAISE EXCEPTION 'Erro: Coluna imagens_urls não foi adicionada';
    END IF;
END $$;
