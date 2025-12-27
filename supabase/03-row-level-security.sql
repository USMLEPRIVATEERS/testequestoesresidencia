-- ============================================
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE testes ENABLE ROW LEVEL SECURITY;
ALTER TABLE respostas_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatisticas_diarias ENABLE ROW LEVEL SECURITY;

-- ====== POLÍTICAS PARA TABELA USUARIOS ======

-- Usuários podem ler apenas seus próprios dados
CREATE POLICY "Usuarios podem ler seus proprios dados"
ON usuarios FOR SELECT
USING (auth.uid() = id);

-- Usuários podem atualizar apenas seus próprios dados
CREATE POLICY "Usuarios podem atualizar seus proprios dados"
ON usuarios FOR UPDATE
USING (auth.uid() = id);

-- ====== POLÍTICAS PARA TABELA QUESTOES ======

-- Todos usuários autenticados podem ler questões
CREATE POLICY "Usuarios autenticados podem ler questoes"
ON questoes FOR SELECT
TO authenticated
USING (true);

-- Apenas administradores podem inserir/atualizar questões (futuramente você pode criar uma role admin)
-- Por enquanto, vamos permitir inserção via service_role apenas

-- ====== POLÍTICAS PARA TABELA TESTES ======

-- Usuários podem ler apenas seus próprios testes
CREATE POLICY "Usuarios podem ler seus proprios testes"
ON testes FOR SELECT
USING (auth.uid() = usuario_id);

-- Usuários podem inserir seus próprios testes
CREATE POLICY "Usuarios podem criar seus proprios testes"
ON testes FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

-- Usuários podem atualizar apenas seus próprios testes
CREATE POLICY "Usuarios podem atualizar seus proprios testes"
ON testes FOR UPDATE
USING (auth.uid() = usuario_id);

-- Usuários podem deletar apenas seus próprios testes
CREATE POLICY "Usuarios podem deletar seus proprios testes"
ON testes FOR DELETE
USING (auth.uid() = usuario_id);

-- ====== POLÍTICAS PARA TABELA RESPOSTAS_USUARIOS ======

-- Usuários podem ler apenas suas próprias respostas
CREATE POLICY "Usuarios podem ler suas proprias respostas"
ON respostas_usuarios FOR SELECT
USING (auth.uid() = usuario_id);

-- Usuários podem inserir apenas suas próprias respostas
CREATE POLICY "Usuarios podem criar suas proprias respostas"
ON respostas_usuarios FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

-- Usuários podem atualizar apenas suas próprias respostas
CREATE POLICY "Usuarios podem atualizar suas proprias respostas"
ON respostas_usuarios FOR UPDATE
USING (auth.uid() = usuario_id);

-- ====== POLÍTICAS PARA TABELA COMENTARIOS ======

-- Usuários podem ler todos os comentários
CREATE POLICY "Usuarios podem ler todos os comentarios"
ON comentarios FOR SELECT
TO authenticated
USING (true);

-- Usuários podem inserir apenas seus próprios comentários
CREATE POLICY "Usuarios podem criar seus proprios comentarios"
ON comentarios FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

-- Usuários podem atualizar/deletar apenas seus próprios comentários
CREATE POLICY "Usuarios podem atualizar seus proprios comentarios"
ON comentarios FOR UPDATE
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios podem deletar seus proprios comentarios"
ON comentarios FOR DELETE
USING (auth.uid() = usuario_id);

-- ====== POLÍTICAS PARA TABELA ESTATISTICAS_DIARIAS ======

-- Usuários podem ler apenas suas próprias estatísticas
CREATE POLICY "Usuarios podem ler suas proprias estatisticas"
ON estatisticas_diarias FOR SELECT
USING (auth.uid() = usuario_id);

-- Sistema pode inserir/atualizar estatísticas (via triggers)
-- Usuários não podem inserir/atualizar manualmente
CREATE POLICY "Sistema pode inserir estatisticas"
ON estatisticas_diarias FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Sistema pode atualizar estatisticas"
ON estatisticas_diarias FOR UPDATE
USING (auth.uid() = usuario_id);
