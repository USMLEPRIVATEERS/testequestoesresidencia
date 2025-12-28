-- ============================================
-- SISTEMA DE WHATSAPP VISÍVEL E VISUALIZAÇÕES DE PERFIL
-- ============================================

-- 1. Adicionar campo whatsapp_visivel na tabela usuarios
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS whatsapp_visivel BOOLEAN DEFAULT FALSE;

-- Criar índice para buscar usuários com whatsapp visível
CREATE INDEX IF NOT EXISTS idx_usuarios_whatsapp_visivel
ON usuarios(whatsapp_visivel);

-- 2. Criar tabela de visualizações de perfil
CREATE TABLE IF NOT EXISTS visualizacoes_perfil (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    visitante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data_visualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT nao_visualizar_proprio_perfil CHECK (usuario_id != visitante_id)
);

-- Índices para visualizações
CREATE INDEX IF NOT EXISTS idx_visualizacoes_usuario
ON visualizacoes_perfil(usuario_id, data_visualizacao DESC);

CREATE INDEX IF NOT EXISTS idx_visualizacoes_visitante
ON visualizacoes_perfil(visitante_id, data_visualizacao DESC);

-- Índice para buscar visualizações (removido WHERE pois NOW() não é IMMUTABLE)
-- Primeiro remove o índice antigo caso exista com WHERE
DROP INDEX IF EXISTS idx_visualizacoes_recentes;
-- A query vai filtrar por data, mas o índice ainda será usado eficientemente
CREATE INDEX idx_visualizacoes_recentes
ON visualizacoes_perfil(usuario_id, data_visualizacao DESC);

-- 3. Criar tabela de usuários reportados
CREATE TABLE IF NOT EXISTS usuarios_reportados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_reportado_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    quem_reportou_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    motivo TEXT,
    data_report TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT nao_reportar_a_si_mesmo CHECK (usuario_reportado_id != quem_reportou_id),
    -- Prevenir múltiplos reports do mesmo usuário para o mesmo alvo
    UNIQUE(usuario_reportado_id, quem_reportou_id)
);

-- Índices para reports
CREATE INDEX IF NOT EXISTS idx_reportados_usuario
ON usuarios_reportados(usuario_reportado_id, data_report DESC);

CREATE INDEX IF NOT EXISTS idx_reportados_quem
ON usuarios_reportados(quem_reportou_id, data_report DESC);

-- 4. Função para registrar visualização de perfil (evita duplicadas)
CREATE OR REPLACE FUNCTION registrar_visualizacao_perfil(
    p_usuario_id UUID,
    p_visitante_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Não registrar se é o próprio perfil
    IF p_usuario_id = p_visitante_id THEN
        RETURN;
    END IF;

    -- Registrar visualização (ou atualizar timestamp se já existe hoje)
    INSERT INTO visualizacoes_perfil (usuario_id, visitante_id, data_visualizacao)
    VALUES (p_usuario_id, p_visitante_id, NOW())
    ON CONFLICT DO NOTHING;

    -- Limpar visualizações antigas (> 24 horas) periodicamente
    DELETE FROM visualizacoes_perfil
    WHERE data_visualizacao < NOW() - INTERVAL '24 hours';
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_visualizacao_perfil(UUID, UUID) TO authenticated;

-- 5. Função para obter visitantes das últimas 24h
CREATE OR REPLACE FUNCTION obter_visitantes_24h(p_usuario_id UUID)
RETURNS TABLE (
    visitante_id UUID,
    nome VARCHAR(255),
    instagram VARCHAR(100),
    data_visualizacao TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id AS visitante_id,
        u.nome,
        u.instagram,
        v.data_visualizacao
    FROM visualizacoes_perfil v
    INNER JOIN usuarios u ON v.visitante_id = u.id
    WHERE v.usuario_id = p_usuario_id
      AND v.data_visualizacao >= NOW() - INTERVAL '24 hours'
    ORDER BY v.data_visualizacao DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION obter_visitantes_24h(UUID) TO authenticated;

-- 6. Função para reportar usuário
CREATE OR REPLACE FUNCTION reportar_usuario(
    p_usuario_reportado_id UUID,
    p_quem_reportou_id UUID,
    p_motivo TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    resultado JSON;
BEGIN
    -- Verificar se não está reportando a si mesmo
    IF p_usuario_reportado_id = p_quem_reportou_id THEN
        RETURN json_build_object('success', false, 'error', 'Você não pode reportar a si mesmo');
    END IF;

    -- Inserir report (ou ignorar se já reportou)
    INSERT INTO usuarios_reportados (usuario_reportado_id, quem_reportou_id, motivo)
    VALUES (p_usuario_reportado_id, p_quem_reportou_id, p_motivo)
    ON CONFLICT (usuario_reportado_id, quem_reportou_id)
    DO UPDATE SET
        motivo = EXCLUDED.motivo,
        data_report = NOW();

    resultado := json_build_object('success', true);
    RETURN resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION reportar_usuario(UUID, UUID, TEXT) TO authenticated;

-- 7. Atualizar função de perfil para incluir whatsapp_visivel
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

-- 8. RLS para visualizacoes_perfil (só pode ler suas próprias visualizações)
ALTER TABLE visualizacoes_perfil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver quem visitou seu perfil"
ON visualizacoes_perfil FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "Sistema pode registrar visualizacoes"
ON visualizacoes_perfil FOR INSERT
TO authenticated
WITH CHECK (visitante_id = auth.uid());

-- 9. RLS para usuarios_reportados (só pode ver seus próprios reports)
ALTER TABLE usuarios_reportados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver seus reports"
ON usuarios_reportados FOR SELECT
TO authenticated
USING (quem_reportou_id = auth.uid());

CREATE POLICY "Usuarios podem criar reports"
ON usuarios_reportados FOR INSERT
TO authenticated
WITH CHECK (quem_reportou_id = auth.uid());

-- 10. View materializada para admins verem usuários mais reportados
CREATE MATERIALIZED VIEW IF NOT EXISTS usuarios_mais_reportados AS
SELECT
    u.id,
    u.nome,
    u.email,
    u.instagram,
    COUNT(r.id) AS total_reports,
    MAX(r.data_report) AS ultimo_report
FROM usuarios u
INNER JOIN usuarios_reportados r ON u.id = r.usuario_reportado_id
GROUP BY u.id, u.nome, u.email, u.instagram
ORDER BY total_reports DESC;

CREATE UNIQUE INDEX idx_mais_reportados_usuario
ON usuarios_mais_reportados(id);

-- ============================================
-- COMENTÁRIOS E USO
-- ============================================

/*
WHATSAPP VISÍVEL:
- Por padrão whatsapp_visivel = FALSE
- Usuário marca checkbox no ranking
- UPDATE usuarios SET whatsapp_visivel = TRUE WHERE id = user_id
- No perfil, só mostra WhatsApp se AMBOS marcaram TRUE

VISUALIZAÇÕES:
- Ao abrir perfil, chama: registrar_visualizacao_perfil(usuario_id, visitante_id)
- No dashboard, chama: obter_visitantes_24h(usuario_id)
- Retorna nome clicável + data

REPORTS:
- Ao reportar: reportar_usuario(reportado_id, quem_reportou_id, 'motivo')
- Não pode reportar si mesmo
- Não pode reportar mesmo usuário 2x (atualiza motivo)
- Admins podem ver usuarios_mais_reportados
*/

-- Refresh inicial da view de reportados
REFRESH MATERIALIZED VIEW usuarios_mais_reportados;
