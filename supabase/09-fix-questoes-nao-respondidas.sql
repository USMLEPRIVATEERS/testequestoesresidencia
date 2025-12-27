-- ============================================
-- CORREÇÃO: FUNÇÃO PARA NUNCA REPETIR QUESTÕES JÁ RESPONDIDAS
-- ============================================

-- Este script atualiza a função obter_questoes_nao_respondidas para
-- NUNCA mostrar questões que o usuário já respondeu, independente
-- do status do teste (em_andamento, pausado ou finalizado).

-- A versão anterior permitia repetir questões de testes finalizados.
-- Esta versão remove TODAS as questões já respondidas.

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
        -- ⚠️ MUDANÇA AQUI: Excluir TODAS as questões já respondidas pelo usuário
        -- (independente do status do teste - em_andamento, pausado OU finalizado)
        SELECT DISTINCT ru.questao_id
        FROM respostas_usuarios ru
        WHERE ru.usuario_id = p_usuario_id
        -- REMOVIDO: AND t.status != 'finalizado'
        -- Agora NUNCA repete questões já respondidas
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

-- ====== VERIFICAÇÃO ======
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Função atualizada com sucesso!';
    RAISE NOTICE '';
    RAISE NOTICE 'Agora questões já respondidas NUNCA';
    RAISE NOTICE 'aparecerão novamente, mesmo em testes';
    RAISE NOTICE 'finalizados.';
    RAISE NOTICE '';
    RAISE NOTICE 'Se você quiser refazer uma questão,';
    RAISE NOTICE 'use o botão "Refazer Teste" em';
    RAISE NOTICE '"Testes Anteriores".';
    RAISE NOTICE '========================================';
END $$;
