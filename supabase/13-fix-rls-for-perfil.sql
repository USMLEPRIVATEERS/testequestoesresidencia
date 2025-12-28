-- ============================================
-- FIX RLS PARA PERFIL - Permitir visualização pública de perfis
-- ============================================

-- 1. Função para obter estatísticas gerais do perfil (todos os tempos)
DROP FUNCTION IF EXISTS obter_estatisticas_perfil(UUID);

CREATE OR REPLACE FUNCTION obter_estatisticas_perfil(p_usuario_id UUID)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    resultado JSON;
BEGIN
    SELECT json_build_object(
        'total_questoes', COUNT(r.questao_id),
        'total_corretas', COUNT(CASE WHEN r.status_resposta = 'C' THEN 1 END),
        'total_incorretas', COUNT(CASE WHEN r.status_resposta = 'I' THEN 1 END),
        'porcentagem_acertos',
            CASE
                WHEN COUNT(r.questao_id) > 0 THEN
                    ROUND((COUNT(CASE WHEN r.status_resposta = 'C' THEN 1 END)::NUMERIC / COUNT(r.questao_id)::NUMERIC) * 100)::INTEGER
                ELSE 0
            END
    ) INTO resultado
    FROM respostas_usuarios r
    WHERE r.usuario_id = p_usuario_id;

    RETURN resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION obter_estatisticas_perfil(UUID) TO authenticated;

-- 2. Função para obter estatísticas do perfil por período
DROP FUNCTION IF EXISTS obter_estatisticas_perfil_periodo(UUID, INTEGER);

CREATE OR REPLACE FUNCTION obter_estatisticas_perfil_periodo(p_usuario_id UUID, p_dias INTEGER)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    data_limite TIMESTAMP;
    resultado JSON;
BEGIN
    -- Se p_dias = 0, retornar todos os tempos
    IF p_dias > 0 THEN
        data_limite := NOW() - (p_dias || ' days')::INTERVAL;
    ELSE
        data_limite := '1970-01-01'::TIMESTAMP; -- Data muito antiga para pegar tudo
    END IF;

    SELECT json_build_object(
        'total_questoes', COUNT(r.questao_id),
        'total_corretas', COUNT(CASE WHEN r.status_resposta = 'C' THEN 1 END),
        'total_incorretas', COUNT(CASE WHEN r.status_resposta = 'I' THEN 1 END),
        'porcentagem_acertos',
            CASE
                WHEN COUNT(r.questao_id) > 0 THEN
                    ROUND((COUNT(CASE WHEN r.status_resposta = 'C' THEN 1 END)::NUMERIC / COUNT(r.questao_id)::NUMERIC) * 100)::INTEGER
                ELSE 0
            END
    ) INTO resultado
    FROM respostas_usuarios r
    WHERE r.usuario_id = p_usuario_id
      AND r.data_resposta >= data_limite;

    RETURN resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION obter_estatisticas_perfil_periodo(UUID, INTEGER) TO authenticated;

-- 3. Função para obter estatísticas por assunto
DROP FUNCTION IF EXISTS obter_estatisticas_por_assunto(UUID, INTEGER);

CREATE OR REPLACE FUNCTION obter_estatisticas_por_assunto(p_usuario_id UUID, p_dias INTEGER)
RETURNS TABLE (
    assunto VARCHAR(255),
    total_questoes BIGINT,
    total_corretas BIGINT,
    porcentagem_acertos INTEGER
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    data_limite TIMESTAMP;
BEGIN
    IF p_dias > 0 THEN
        data_limite := NOW() - (p_dias || ' days')::INTERVAL;
    ELSE
        data_limite := '1970-01-01'::TIMESTAMP;
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(q.assunto, 'Sem assunto')::VARCHAR(255) AS assunto,
        COUNT(r.questao_id) AS total_questoes,
        COUNT(CASE WHEN r.status_resposta = 'C' THEN 1 END) AS total_corretas,
        CASE
            WHEN COUNT(r.questao_id) > 0 THEN
                ROUND((COUNT(CASE WHEN r.status_resposta = 'C' THEN 1 END)::NUMERIC / COUNT(r.questao_id)::NUMERIC) * 100)::INTEGER
            ELSE 0
        END AS porcentagem_acertos
    FROM respostas_usuarios r
    INNER JOIN questoes q ON r.questao_id = q.id
    WHERE r.usuario_id = p_usuario_id
      AND r.data_resposta >= data_limite
    GROUP BY q.assunto
    ORDER BY total_questoes DESC
    LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION obter_estatisticas_por_assunto(UUID, INTEGER) TO authenticated;

-- 4. Função para obter atividade recente (últimos 5 testes finalizados)
DROP FUNCTION IF EXISTS obter_atividade_recente(UUID);

CREATE OR REPLACE FUNCTION obter_atividade_recente(p_usuario_id UUID)
RETURNS TABLE (
    teste_id UUID,
    modo VARCHAR(20),
    data_finalizacao TIMESTAMP WITH TIME ZONE,
    total_questoes BIGINT,
    total_corretas BIGINT,
    porcentagem_acertos INTEGER
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id AS teste_id,
        t.modo,
        t.data_finalizacao,
        COUNT(r.questao_id) AS total_questoes,
        COUNT(CASE WHEN r.status_resposta = 'C' THEN 1 END) AS total_corretas,
        CASE
            WHEN COUNT(r.questao_id) > 0 THEN
                ROUND((COUNT(CASE WHEN r.status_resposta = 'C' THEN 1 END)::NUMERIC / COUNT(r.questao_id)::NUMERIC) * 100)::INTEGER
            ELSE 0
        END AS porcentagem_acertos
    FROM testes t
    LEFT JOIN respostas_usuarios r ON t.id = r.teste_id
    WHERE t.usuario_id = p_usuario_id
      AND t.status = 'finalizado'
    GROUP BY t.id, t.modo, t.data_finalizacao
    ORDER BY t.data_finalizacao DESC
    LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION obter_atividade_recente(UUID) TO authenticated;

-- 5. Função para obter posição no ranking
DROP FUNCTION IF EXISTS obter_posicao_ranking(UUID);

CREATE OR REPLACE FUNCTION obter_posicao_ranking(p_usuario_id UUID)
RETURNS INTEGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    posicao INTEGER;
    data_limite TIMESTAMP;
BEGIN
    data_limite := NOW() - INTERVAL '30 days';

    WITH ranking AS (
        SELECT
            u.id,
            COUNT(r.questao_id) AS total_questoes,
            ROW_NUMBER() OVER (ORDER BY COUNT(r.questao_id) DESC) AS posicao
        FROM usuarios u
        LEFT JOIN respostas_usuarios r
            ON u.id = r.usuario_id
            AND r.data_resposta >= data_limite
        GROUP BY u.id
    )
    SELECT ranking.posicao INTO posicao
    FROM ranking
    WHERE ranking.id = p_usuario_id;

    RETURN COALESCE(posicao, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION obter_posicao_ranking(UUID) TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================

-- Estas funções permitem visualização pública de perfis mantendo a segurança:
-- ✅ Apenas estatísticas agregadas são expostas
-- ✅ Respostas individuais continuam privadas
-- ✅ Testes individuais continuam privados
-- ✅ Nomes de usuários e instagrams já são públicos pela função do ranking
-- ✅ Performance otimizada com queries SQL ao invés de múltiplas chamadas JS
