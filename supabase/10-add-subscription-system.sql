-- ============================================
-- SISTEMA DE ASSINATURAS E PLANOS
-- ============================================

-- Adicionar colunas de plano na tabela usuarios
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS plano VARCHAR(20) DEFAULT 'free' CHECK (plano IN ('free', 'mensal', 'semestral', 'anual')),
ADD COLUMN IF NOT EXISTS data_inicio_plano TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS data_fim_plano TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS questoes_respondidas_hoje INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_atualizacao_contador DATE DEFAULT CURRENT_DATE;

-- Comentários explicativos
COMMENT ON COLUMN usuarios.plano IS 'Plano do usuário: free (10 questões/dia), mensal (ilimitado), semestral (ilimitado), anual (ilimitado)';
COMMENT ON COLUMN usuarios.data_inicio_plano IS 'Data de início do plano atual';
COMMENT ON COLUMN usuarios.data_fim_plano IS 'Data de término do plano pago (NULL para free)';
COMMENT ON COLUMN usuarios.questoes_respondidas_hoje IS 'Contador de questões respondidas hoje (apenas para plano free)';
COMMENT ON COLUMN usuarios.ultima_atualizacao_contador IS 'Última data que o contador foi atualizado';

-- Criar tabela de histórico de assinaturas
CREATE TABLE IF NOT EXISTS historico_assinaturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    plano_anterior VARCHAR(20),
    plano_novo VARCHAR(20) NOT NULL,
    valor_pago DECIMAL(10, 2),
    metodo_pagamento VARCHAR(50), -- 'pix', 'cartao', 'boleto', etc
    status_pagamento VARCHAR(20) DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'aprovado', 'recusado', 'cancelado')),
    transacao_id VARCHAR(255), -- ID da transação do gateway de pagamento
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notas TEXT
);

CREATE INDEX idx_historico_usuario ON historico_assinaturas(usuario_id);
CREATE INDEX idx_historico_status ON historico_assinaturas(status_pagamento);

-- Função para resetar contador diário de questões
CREATE OR REPLACE FUNCTION resetar_contador_questoes_diario()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a data da última atualização for diferente de hoje, resetar contador
    IF NEW.ultima_atualizacao_contador < CURRENT_DATE THEN
        NEW.questoes_respondidas_hoje := 0;
        NEW.ultima_atualizacao_contador := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para resetar contador ao atualizar usuário
DROP TRIGGER IF EXISTS trigger_resetar_contador_diario ON usuarios;
CREATE TRIGGER trigger_resetar_contador_diario
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION resetar_contador_questoes_diario();

-- Função para incrementar contador de questões ao responder
CREATE OR REPLACE FUNCTION incrementar_contador_questoes()
RETURNS TRIGGER AS $$
DECLARE
    plano_usuario VARCHAR(20);
    questoes_hoje INTEGER;
    data_ultima_atualizacao DATE;
BEGIN
    -- Buscar informações do plano do usuário
    SELECT plano, questoes_respondidas_hoje, ultima_atualizacao_contador
    INTO plano_usuario, questoes_hoje, data_ultima_atualizacao
    FROM usuarios
    WHERE id = NEW.usuario_id;

    -- Apenas incrementar contador para usuários do plano FREE
    IF plano_usuario = 'free' THEN
        -- Se a data mudou, resetar contador
        IF data_ultima_atualizacao < CURRENT_DATE THEN
            questoes_hoje := 0;
        END IF;

        -- Incrementar contador
        UPDATE usuarios
        SET questoes_respondidas_hoje = questoes_hoje + 1,
            ultima_atualizacao_contador = CURRENT_DATE
        WHERE id = NEW.usuario_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para incrementar contador ao inserir resposta
DROP TRIGGER IF EXISTS trigger_incrementar_contador ON respostas_usuarios;
CREATE TRIGGER trigger_incrementar_contador
    AFTER INSERT ON respostas_usuarios
    FOR EACH ROW
    EXECUTE FUNCTION incrementar_contador_questoes();

-- Função para verificar se usuário pode responder questão
CREATE OR REPLACE FUNCTION pode_responder_questao(p_usuario_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    plano_usuario VARCHAR(20);
    questoes_hoje INTEGER;
    data_ultima_atualizacao DATE;
    data_fim TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Buscar informações do usuário
    SELECT plano, questoes_respondidas_hoje, ultima_atualizacao_contador, data_fim_plano
    INTO plano_usuario, questoes_hoje, data_ultima_atualizacao, data_fim
    FROM usuarios
    WHERE id = p_usuario_id;

    -- Se usuário não encontrado, retornar false
    IF plano_usuario IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Planos pagos: verificar se plano está ativo
    IF plano_usuario IN ('mensal', 'semestral', 'anual') THEN
        IF data_fim IS NULL OR data_fim > NOW() THEN
            RETURN TRUE; -- Plano ativo, pode responder ilimitado
        ELSE
            RETURN FALSE; -- Plano expirado
        END IF;
    END IF;

    -- Plano FREE: verificar limite diário
    IF plano_usuario = 'free' THEN
        -- Se a data mudou desde a última atualização, resetar contador
        IF data_ultima_atualizacao < CURRENT_DATE THEN
            questoes_hoje := 0;
        END IF;

        -- Verificar se ainda tem questões disponíveis (limite: 10/dia)
        RETURN questoes_hoje < 10;
    END IF;

    -- Caso não identificado, permitir por padrão
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para obter informações do plano do usuário
CREATE OR REPLACE FUNCTION obter_info_plano(p_usuario_id UUID)
RETURNS TABLE (
    plano VARCHAR,
    questoes_restantes INTEGER,
    plano_ativo BOOLEAN,
    data_expiracao TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    plano_usuario VARCHAR(20);
    questoes_hoje INTEGER;
    data_ultima_atualizacao DATE;
    data_fim TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Buscar informações do usuário
    SELECT u.plano, u.questoes_respondidas_hoje, u.ultima_atualizacao_contador, u.data_fim_plano
    INTO plano_usuario, questoes_hoje, data_ultima_atualizacao, data_fim
    FROM usuarios u
    WHERE u.id = p_usuario_id;

    -- Resetar contador se a data mudou
    IF data_ultima_atualizacao < CURRENT_DATE THEN
        questoes_hoje := 0;
    END IF;

    -- Retornar informações baseadas no plano
    IF plano_usuario = 'free' THEN
        RETURN QUERY SELECT
            plano_usuario::VARCHAR,
            (10 - questoes_hoje)::INTEGER AS questoes_restantes,
            TRUE::BOOLEAN AS plano_ativo,
            NULL::TIMESTAMP WITH TIME ZONE AS data_expiracao;
    ELSE
        -- Planos pagos
        RETURN QUERY SELECT
            plano_usuario::VARCHAR,
            999999::INTEGER AS questoes_restantes, -- "ilimitado"
            (data_fim IS NULL OR data_fim > NOW())::BOOLEAN AS plano_ativo,
            data_fim AS data_expiracao;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ====== ATUALIZAR POLÍTICAS RLS ======

-- Permitir usuários verem seu próprio histórico de assinaturas
ALTER TABLE historico_assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver seu proprio historico"
ON historico_assinaturas FOR SELECT
USING (auth.uid() = usuario_id);

-- ====== MENSAGENS DE SUCESSO ======
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Sistema de Assinaturas Configurado!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PLANOS DISPONÍVEIS:';
    RAISE NOTICE '  • FREE: 10 questões/dia (padrão)';
    RAISE NOTICE '  • MENSAL: Ilimitado - R$ 60/mês';
    RAISE NOTICE '  • SEMESTRAL: Ilimitado - R$ 300/6 meses';
    RAISE NOTICE '  • ANUAL: Ilimitado - R$ 500/12 meses';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FUNÇÕES CRIADAS:';
    RAISE NOTICE '  • pode_responder_questao(usuario_id)';
    RAISE NOTICE '  • obter_info_plano(usuario_id)';
    RAISE NOTICE '  • incrementar_contador_questoes()';
    RAISE NOTICE '  • resetar_contador_questoes_diario()';
    RAISE NOTICE '';
    RAISE NOTICE '📊 TABELAS:';
    RAISE NOTICE '  • usuarios: colunas de plano adicionadas';
    RAISE NOTICE '  • historico_assinaturas: criada';
    RAISE NOTICE '';
    RAISE NOTICE 'Todos os novos usuários começam no plano FREE automaticamente!';
    RAISE NOTICE '========================================';
END $$;
