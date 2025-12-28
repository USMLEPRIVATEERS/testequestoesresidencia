-- ============================================
-- ÍNDICES DE PERFORMANCE PARA ESCALABILIDADE
-- Otimizado para 20k+ usuários
-- ============================================

-- ============================================
-- 1. ÍNDICES PARA RESPOSTAS_USUARIOS
-- ============================================

-- Índice composto para queries do dashboard (usuario + data)
-- Melhora performance de queries como "respostas dos últimos 30 dias"
CREATE INDEX IF NOT EXISTS idx_respostas_usuario_data
ON respostas_usuarios(usuario_id, data_resposta DESC);

-- Índice composto para JOIN com questoes (usado no dashboard)
-- Permite queries eficientes filtrando por usuário e incluindo questao_id
CREATE INDEX IF NOT EXISTS idx_respostas_usuario_questao_status
ON respostas_usuarios(usuario_id, questao_id, status_resposta);

-- Índice para queries de ranking (data + status)
-- Otimiza cálculo de acertos nos últimos 30 dias
CREATE INDEX IF NOT EXISTS idx_respostas_data_status
ON respostas_usuarios(data_resposta DESC, status_resposta)
WHERE status_resposta IN ('C', 'I');

-- Índice PARTIAL para respostas corretas (ranking de top performers)
CREATE INDEX IF NOT EXISTS idx_respostas_corretas
ON respostas_usuarios(usuario_id, data_resposta DESC)
WHERE status_resposta = 'C';

-- ============================================
-- 2. ÍNDICES PARA QUESTOES
-- ============================================

-- Índice composto para filtros comuns (instituição + ano + assunto)
CREATE INDEX IF NOT EXISTS idx_questoes_filtros
ON questoes(processo_seletivo, ano DESC, assunto);

-- Índice para busca por processo seletivo (muito usado)
-- Já existe idx_questoes_instituicao, mas processo_seletivo é mais específico
CREATE INDEX IF NOT EXISTS idx_questoes_processo
ON questoes(processo_seletivo);

-- Índice para queries de estatísticas (assunto + sistema)
CREATE INDEX IF NOT EXISTS idx_questoes_assunto_sistema
ON questoes(assunto, sistema);

-- ============================================
-- 3. ÍNDICES PARA TESTES
-- ============================================

-- Índice composto para queries de histórico (usuario + data + status)
CREATE INDEX IF NOT EXISTS idx_testes_usuario_data_status
ON testes(usuario_id, data_finalizacao DESC NULLS LAST, status);

-- Índice para queries de testes em andamento
CREATE INDEX IF NOT EXISTS idx_testes_em_andamento
ON testes(usuario_id, data_inicio DESC)
WHERE status = 'em_andamento';

-- ============================================
-- 4. ÍNDICES PARA COMENTARIOS
-- ============================================

-- Índice composto para carregar comentários (questao + data)
CREATE INDEX IF NOT EXISTS idx_comentarios_questao_data
ON comentarios(questao_id, data_criacao DESC);

-- ============================================
-- 5. ÍNDICES PARA USUARIOS
-- ============================================

-- Índice para queries de provas selecionadas (usando GIN para arrays)
CREATE INDEX IF NOT EXISTS idx_usuarios_provas_gin
ON usuarios USING GIN(provas_selecionadas);

-- Índice para busca por email (login)
-- Já existe por ser UNIQUE, mas vamos garantir
CREATE INDEX IF NOT EXISTS idx_usuarios_email
ON usuarios(email);

-- ============================================
-- 6. VACUUM E ANALYZE
-- ============================================

-- Atualizar estatísticas do otimizador após criar índices
ANALYZE respostas_usuarios;
ANALYZE questoes;
ANALYZE testes;
ANALYZE comentarios;
ANALYZE usuarios;

-- ============================================
-- 7. COMENTÁRIOS E IMPACTO
-- ============================================

-- Impacto esperado com 20k usuários:
--
-- Dashboard:
--   Antes: 2-5 segundos (full table scan)
--   Depois: 100-300ms (index scan)
--   Melhoria: 10-50x mais rápido
--
-- Ranking:
--   Antes: 10-30 segundos (JOIN de 20M rows)
--   Depois: 1-3 segundos (com materialized view será <100ms)
--   Melhoria: 10-30x mais rápido
--
-- Perfil:
--   Antes: 3-8 segundos (múltiplos full scans)
--   Depois: 200-500ms (index scans)
--   Melhoria: 15-40x mais rápido
--
-- Espaço em disco adicional: ~200-500 MB (para 20M respostas)
-- Overhead de INSERT: +5-10% (aceitável)

-- ============================================
-- 8. MONITORAMENTO
-- ============================================

-- Query para verificar uso dos índices:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Query para verificar tamanho dos índices:
-- SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexname::regclass) DESC;
