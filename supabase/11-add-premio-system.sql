-- ============================================
-- SISTEMA DE PRÊMIOS - CONTRIBUIÇÃO DE PROVAS
-- ============================================

-- Tabela de provas necessárias (que estamos procurando)
CREATE TABLE IF NOT EXISTS provas_necessarias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instituicao VARCHAR(255) NOT NULL,
    processo_seletivo VARCHAR(255) NOT NULL,
    ano INTEGER NOT NULL,
    especialidade VARCHAR(255),
    status VARCHAR(20) DEFAULT 'procurando' CHECK (status IN ('procurando', 'recebida', 'completa')),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacoes TEXT,
    UNIQUE(instituicao, processo_seletivo, ano)
);

CREATE INDEX idx_provas_necessarias_status ON provas_necessarias(status);
CREATE INDEX idx_provas_necessarias_ano ON provas_necessarias(ano);

-- Comentários
COMMENT ON COLUMN provas_necessarias.status IS 'procurando (ainda precisamos), recebida (alguém enviou), completa (validada e adicionada)';

-- Tabela de contribuições de usuários
CREATE TABLE IF NOT EXISTS contribuicoes_provas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    prova_necessaria_id UUID NOT NULL REFERENCES provas_necessarias(id) ON DELETE CASCADE,
    link_drive VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
    motivo_recusa TEXT,
    data_contribuicao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_validacao TIMESTAMP WITH TIME ZONE,
    validado_por UUID REFERENCES usuarios(id),
    premio_concedido BOOLEAN DEFAULT FALSE,
    data_premio TIMESTAMP WITH TIME ZONE,
    observacoes TEXT
);

CREATE INDEX idx_contribuicoes_usuario ON contribuicoes_provas(usuario_id);
CREATE INDEX idx_contribuicoes_prova ON contribuicoes_provas(prova_necessaria_id);
CREATE INDEX idx_contribuicoes_status ON contribuicoes_provas(status);

-- Comentários
COMMENT ON COLUMN contribuicoes_provas.link_drive IS 'Link do Google Drive compartilhado com "qualquer pessoa com o link"';
COMMENT ON COLUMN contribuicoes_provas.status IS 'pendente (aguardando validação), aprovada (prêmio concedido), recusada (não atende critérios)';
COMMENT ON COLUMN contribuicoes_provas.premio_concedido IS 'TRUE quando o prêmio (1 mês grátis) foi aplicado à conta';

-- Habilitar RLS
ALTER TABLE provas_necessarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribuicoes_provas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para provas_necessarias
-- Todos usuários autenticados podem ver provas necessárias
CREATE POLICY "Usuarios autenticados podem ver provas necessarias"
ON provas_necessarias FOR SELECT
TO authenticated
USING (true);

-- Políticas RLS para contribuicoes_provas
-- Usuários podem ver suas próprias contribuições
CREATE POLICY "Usuarios podem ver suas contribuicoes"
ON contribuicoes_provas FOR SELECT
USING (auth.uid() = usuario_id);

-- Usuários podem criar contribuições
CREATE POLICY "Usuarios podem criar contribuicoes"
ON contribuicoes_provas FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

-- Função para conceder prêmio (1 mês grátis)
CREATE OR REPLACE FUNCTION conceder_premio_contribuicao(
    p_contribuicao_id UUID,
    p_validador_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_usuario_id UUID;
    v_premio_ja_concedido BOOLEAN;
BEGIN
    -- Buscar informações da contribuição
    SELECT usuario_id, premio_concedido
    INTO v_usuario_id, v_premio_ja_concedido
    FROM contribuicoes_provas
    WHERE id = p_contribuicao_id;

    -- Verificar se já foi concedido
    IF v_premio_ja_concedido THEN
        RAISE EXCEPTION 'Prêmio já foi concedido para esta contribuição';
    END IF;

    -- Atualizar contribuição como aprovada
    UPDATE contribuicoes_provas
    SET status = 'aprovada',
        data_validacao = NOW(),
        validado_por = p_validador_id,
        premio_concedido = TRUE,
        data_premio = NOW()
    WHERE id = p_contribuicao_id;

    -- Conceder 1 mês de plano mensal ao usuário
    -- Se o usuário já tem plano pago, estender por 30 dias
    -- Se o usuário está no FREE, mudar para mensal por 30 dias
    UPDATE usuarios
    SET
        plano = 'mensal',
        data_fim_plano = CASE
            WHEN data_fim_plano IS NULL OR data_fim_plano < NOW() THEN NOW() + INTERVAL '30 days'
            ELSE data_fim_plano + INTERVAL '30 days'
        END
    WHERE id = v_usuario_id;

    -- Registrar no histórico de assinaturas
    INSERT INTO historico_assinaturas (
        usuario_id,
        plano_anterior,
        plano_novo,
        valor_pago,
        metodo_pagamento,
        status_pagamento,
        data_inicio,
        data_fim,
        notas
    )
    SELECT
        v_usuario_id,
        plano,
        'mensal',
        0.00,
        'premio_contribuicao',
        'aprovado',
        NOW(),
        CASE
            WHEN data_fim_plano IS NULL OR data_fim_plano < NOW() THEN NOW() + INTERVAL '30 days'
            ELSE data_fim_plano + INTERVAL '30 days'
        END,
        'Prêmio por contribuição de prova - ID: ' || p_contribuicao_id
    FROM usuarios
    WHERE id = v_usuario_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para recusar contribuição
CREATE OR REPLACE FUNCTION recusar_contribuicao(
    p_contribuicao_id UUID,
    p_validador_id UUID,
    p_motivo TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE contribuicoes_provas
    SET status = 'recusada',
        motivo_recusa = p_motivo,
        data_validacao = NOW(),
        validado_por = p_validador_id
    WHERE id = p_contribuicao_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir exemplos de provas necessárias
INSERT INTO provas_necessarias (instituicao, processo_seletivo, ano, especialidade, observacoes) VALUES
    ('USP', 'Residência Médica USP', 2024, 'Acesso Direto', 'Prova de 2024 - Precisamos do PDF da prova + gabarito'),
    ('UNIFESP', 'Residência Médica UNIFESP', 2024, 'Clínica Médica', 'Prova de 2024 - Precisamos do PDF completo'),
    ('UNICAMP', 'Residência Médica UNICAMP', 2023, 'Cirurgia Geral', 'Prova de 2023 - Precisamos do PDF da prova + gabarito oficial'),
    ('HC-FMUSP', 'Residência Médica HC', 2024, 'Pediatria', 'Prova de 2024 - PDF da prova e gabarito'),
    ('Santa Casa SP', 'Residência Santa Casa', 2023, 'Ortopedia', 'Prova de 2023 - Precisamos urgentemente'),
    ('UERJ', 'Residência Médica UERJ', 2024, 'Cardiologia', 'Prova de 2024 - PDF completo + gabarito'),
    ('SUS-SP', 'Acesso Direto SUS-SP', 2024, 'Acesso Direto', 'Prova de 2024 - Precisamos do material completo'),
    ('IAMSPE', 'Residência IAMSPE', 2023, 'Neurologia', 'Prova de 2023 - PDF da prova + gabarito'),
    ('Hospital Albert Einstein', 'Residência Einstein', 2024, 'Radiologia', 'Prova de 2024 - Material completo'),
    ('ENARE', 'ENARE Nacional', 2024, 'Anestesiologia', 'Prova ENARE 2024 - PDF + gabarito oficial')
ON CONFLICT (instituicao, processo_seletivo, ano) DO NOTHING;

-- ====== MENSAGENS DE SUCESSO ======
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Sistema de Prêmios Configurado!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 TABELAS CRIADAS:';
    RAISE NOTICE '  • provas_necessarias (provas que precisamos)';
    RAISE NOTICE '  • contribuicoes_provas (envios dos usuários)';
    RAISE NOTICE '';
    RAISE NOTICE '🎁 PRÊMIO:';
    RAISE NOTICE '  • 1 mês GRÁTIS de plano mensal';
    RAISE NOTICE '  • Por cada prova aprovada';
    RAISE NOTICE '  • Sem limite de contribuições';
    RAISE NOTICE '';
    RAISE NOTICE '📝 EXEMPLOS INSERIDOS:';
    RAISE NOTICE '  • 10 provas de exemplo inseridas';
    RAISE NOTICE '  • Edite conforme necessário';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FUNÇÕES CRIADAS:';
    RAISE NOTICE '  • conceder_premio_contribuicao()';
    RAISE NOTICE '  • recusar_contribuicao()';
    RAISE NOTICE '========================================';
END $$;
