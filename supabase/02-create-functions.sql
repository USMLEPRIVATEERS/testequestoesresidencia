-- ============================================
-- FUNÇÕES E TRIGGERS DO SUPABASE
-- ============================================

-- 1. FUNÇÃO PARA CALCULAR PORCENTAGEM DE ACERTOS DE UMA QUESTÃO
CREATE OR REPLACE FUNCTION calcular_dificuldade_questao(questao_uuid UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    taxa_acerto NUMERIC;
BEGIN
    SELECT
        CASE
            WHEN total_marcacoes = 0 THEN 0
            ELSE (total_acertos::NUMERIC / total_marcacoes::NUMERIC) * 100
        END
    INTO taxa_acerto
    FROM questoes
    WHERE id = questao_uuid;

    IF taxa_acerto < 40 THEN
        RETURN 'Difícil';
    ELSIF taxa_acerto >= 40 AND taxa_acerto <= 60 THEN
        RETURN 'Intermediário';
    ELSE
        RETURN 'Fácil';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNÇÃO PARA ATUALIZAR CONTADOR DE ACERTOS DAS QUESTÕES
CREATE OR REPLACE FUNCTION atualizar_estatisticas_questao()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar total de marcações e acertos na tabela questoes
    UPDATE questoes
    SET
        total_marcacoes = total_marcacoes + 1,
        total_acertos = total_acertos + CASE WHEN NEW.status_resposta = 'C' THEN 1 ELSE 0 END
    WHERE id = NEW.questao_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função quando uma resposta for inserida
CREATE TRIGGER trigger_atualizar_estatisticas_questao
AFTER INSERT ON respostas_usuarios
FOR EACH ROW
EXECUTE FUNCTION atualizar_estatisticas_questao();

-- 3. FUNÇÃO PARA ATUALIZAR ESTATÍSTICAS DIÁRIAS DO USUÁRIO
CREATE OR REPLACE FUNCTION atualizar_estatisticas_diarias()
RETURNS TRIGGER AS $$
DECLARE
    data_hoje DATE;
    tempo_resposta INT;
BEGIN
    data_hoje := DATE(NEW.data_resposta);
    tempo_resposta := COALESCE(NEW.tempo_resposta_segundos, 0);

    -- Inserir ou atualizar estatísticas do dia
    INSERT INTO estatisticas_diarias (usuario_id, data, total_questoes, total_corretas, total_incorretas, tempo_total_segundos)
    VALUES (
        NEW.usuario_id,
        data_hoje,
        1,
        CASE WHEN NEW.status_resposta = 'C' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status_resposta = 'I' THEN 1 ELSE 0 END,
        tempo_resposta
    )
    ON CONFLICT (usuario_id, data)
    DO UPDATE SET
        total_questoes = estatisticas_diarias.total_questoes + 1,
        total_corretas = estatisticas_diarias.total_corretas + CASE WHEN NEW.status_resposta = 'C' THEN 1 ELSE 0 END,
        total_incorretas = estatisticas_diarias.total_incorretas + CASE WHEN NEW.status_resposta = 'I' THEN 1 ELSE 0 END,
        tempo_total_segundos = estatisticas_diarias.tempo_total_segundos + tempo_resposta;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estatísticas diárias
CREATE TRIGGER trigger_atualizar_estatisticas_diarias
AFTER INSERT ON respostas_usuarios
FOR EACH ROW
EXECUTE FUNCTION atualizar_estatisticas_diarias();

-- 4. FUNÇÃO PARA OBTER QUESTÕES NÃO RESPONDIDAS PELO USUÁRIO
CREATE OR REPLACE FUNCTION obter_questoes_nao_respondidas(
    p_usuario_id UUID,
    p_filtros JSONB,
    p_limite INTEGER DEFAULT 100
)
RETURNS TABLE (
    questao_id UUID,
    instituicao VARCHAR,
    processo_seletivo VARCHAR,
    ano INTEGER,
    assunto VARCHAR,
    sistema VARCHAR,
    categoria VARCHAR,
    topico VARCHAR,
    subtopico VARCHAR,
    tipo_questao VARCHAR,
    questao_texto TEXT,
    alternativas JSONB,
    gabarito VARCHAR,
    resolucao_comentada TEXT,
    acertos_marcacoes TEXT,
    dificuldade VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id,
        q.instituicao,
        q.processo_seletivo,
        q.ano,
        q.assunto,
        q.sistema,
        q.categoria,
        q.topico,
        q.subtopico,
        q.tipo_questao,
        q.questao_texto,
        q.alternativas,
        q.gabarito,
        q.resolucao_comentada,
        CONCAT(q.total_acertos, ' / ', q.total_marcacoes) AS acertos_marcacoes,
        calcular_dificuldade_questao(q.id) AS dificuldade
    FROM questoes q
    WHERE q.id NOT IN (
        -- Excluir questões já respondidas pelo usuário (exceto em testes finalizados que podem ser refeitos)
        SELECT DISTINCT ru.questao_id
        FROM respostas_usuarios ru
        JOIN testes t ON ru.teste_id = t.id
        WHERE ru.usuario_id = p_usuario_id
        AND t.status != 'finalizado' -- Permite repetir questões de testes já finalizados
    )
    -- Aplicar filtros dinâmicos
    AND (p_filtros->>'instituicao' IS NULL OR q.instituicao = p_filtros->>'instituicao')
    AND (p_filtros->>'processo_seletivo' IS NULL OR q.processo_seletivo = p_filtros->>'processo_seletivo')
    AND (p_filtros->>'ano' IS NULL OR q.ano = (p_filtros->>'ano')::INTEGER)
    AND (p_filtros->>'assunto' IS NULL OR q.assunto = p_filtros->>'assunto')
    AND (p_filtros->>'sistema' IS NULL OR q.sistema = p_filtros->>'sistema')
    AND (p_filtros->>'categoria' IS NULL OR q.categoria = p_filtros->>'categoria')
    AND (p_filtros->>'topico' IS NULL OR q.topico = p_filtros->>'topico')
    AND (p_filtros->>'subtopico' IS NULL OR q.subtopico = p_filtros->>'subtopico')
    AND (p_filtros->>'tipo_questao' IS NULL OR q.tipo_questao = p_filtros->>'tipo_questao')
    AND (p_filtros->>'dificuldade' IS NULL OR calcular_dificuldade_questao(q.id) = p_filtros->>'dificuldade')
    ORDER BY RANDOM()
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO PARA OBTER ESTATÍSTICAS DO DASHBOARD
CREATE OR REPLACE FUNCTION obter_estatisticas_dashboard(
    p_usuario_id UUID,
    p_periodo VARCHAR DEFAULT 'diario', -- 'diario', 'semanal', 'mensal'
    p_metrica VARCHAR DEFAULT 'total' -- 'total', 'corretas', 'incorretas', 'porcentagem_acertos', 'porcentagem_erros'
)
RETURNS TABLE (
    data DATE,
    valor NUMERIC
) AS $$
BEGIN
    IF p_periodo = 'diario' THEN
        RETURN QUERY
        SELECT
            ed.data,
            CASE p_metrica
                WHEN 'total' THEN ed.total_questoes::NUMERIC
                WHEN 'corretas' THEN ed.total_corretas::NUMERIC
                WHEN 'incorretas' THEN ed.total_incorretas::NUMERIC
                WHEN 'porcentagem_acertos' THEN
                    CASE WHEN ed.total_questoes > 0
                    THEN ROUND((ed.total_corretas::NUMERIC / ed.total_questoes::NUMERIC) * 100, 2)
                    ELSE 0 END
                WHEN 'porcentagem_erros' THEN
                    CASE WHEN ed.total_questoes > 0
                    THEN ROUND((ed.total_incorretas::NUMERIC / ed.total_questoes::NUMERIC) * 100, 2)
                    ELSE 0 END
                ELSE 0
            END AS valor
        FROM estatisticas_diarias ed
        WHERE ed.usuario_id = p_usuario_id
        AND ed.data >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY ed.data;

    ELSIF p_periodo = 'semanal' THEN
        RETURN QUERY
        SELECT
            DATE_TRUNC('week', ed.data)::DATE AS data,
            CASE p_metrica
                WHEN 'total' THEN SUM(ed.total_questoes)::NUMERIC
                WHEN 'corretas' THEN SUM(ed.total_corretas)::NUMERIC
                WHEN 'incorretas' THEN SUM(ed.total_incorretas)::NUMERIC
                WHEN 'porcentagem_acertos' THEN
                    CASE WHEN SUM(ed.total_questoes) > 0
                    THEN ROUND((SUM(ed.total_corretas)::NUMERIC / SUM(ed.total_questoes)::NUMERIC) * 100, 2)
                    ELSE 0 END
                WHEN 'porcentagem_erros' THEN
                    CASE WHEN SUM(ed.total_questoes) > 0
                    THEN ROUND((SUM(ed.total_incorretas)::NUMERIC / SUM(ed.total_questoes)::NUMERIC) * 100, 2)
                    ELSE 0 END
                ELSE 0
            END AS valor
        FROM estatisticas_diarias ed
        WHERE ed.usuario_id = p_usuario_id
        AND ed.data >= CURRENT_DATE - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', ed.data)
        ORDER BY DATE_TRUNC('week', ed.data);

    ELSE -- mensal
        RETURN QUERY
        SELECT
            DATE_TRUNC('month', ed.data)::DATE AS data,
            CASE p_metrica
                WHEN 'total' THEN SUM(ed.total_questoes)::NUMERIC
                WHEN 'corretas' THEN SUM(ed.total_corretas)::NUMERIC
                WHEN 'incorretas' THEN SUM(ed.total_incorretas)::NUMERIC
                WHEN 'porcentagem_acertos' THEN
                    CASE WHEN SUM(ed.total_questoes) > 0
                    THEN ROUND((SUM(ed.total_corretas)::NUMERIC / SUM(ed.total_questoes)::NUMERIC) * 100, 2)
                    ELSE 0 END
                WHEN 'porcentagem_erros' THEN
                    CASE WHEN SUM(ed.total_questoes) > 0
                    THEN ROUND((SUM(ed.total_incorretas)::NUMERIC / SUM(ed.total_questoes)::NUMERIC) * 100, 2)
                    ELSE 0 END
                ELSE 0
            END AS valor
        FROM estatisticas_diarias ed
        WHERE ed.usuario_id = p_usuario_id
        AND ed.data >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', ed.data)
        ORDER BY DATE_TRUNC('month', ed.data);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. ATUALIZAR ÚLTIMO ACESSO DO USUÁRIO
CREATE OR REPLACE FUNCTION atualizar_ultimo_acesso()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultimo_acesso := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
