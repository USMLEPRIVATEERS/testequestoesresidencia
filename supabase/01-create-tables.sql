-- ============================================
-- QUESTOES RESIDENCIA - SCHEMA SQL SUPABASE
-- ============================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ultimo_acesso TIMESTAMP WITH TIME ZONE,
    provas_selecionadas TEXT[] DEFAULT '{}', -- Array com as provas que o usuário quer fazer
    CONSTRAINT email_valido CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 2. TABELA DE QUESTÕES (QBANK)
CREATE TABLE IF NOT EXISTS questoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instituicao VARCHAR(255) NOT NULL,
    processo_seletivo VARCHAR(255) NOT NULL,
    ano INTEGER NOT NULL,
    assunto VARCHAR(255),
    sistema VARCHAR(255),
    categoria VARCHAR(255),
    topico VARCHAR(255),
    subtopico VARCHAR(255),
    tipo_questao VARCHAR(50) NOT NULL, -- 'multipla_escolha', 'verdadeiro_falso', 'dissertativa'
    questao_texto TEXT NOT NULL,
    imagens_urls TEXT[], -- Array de URLs de imagens (ex: Imgur, ImgBB, etc)
    alternativas JSONB, -- Array de objetos: [{"letra": "A", "texto": "..."}, ...]
    gabarito VARCHAR(10) NOT NULL, -- Para múltipla escolha: "A", "B", etc
    resolucao_comentada TEXT,
    total_marcacoes INTEGER DEFAULT 0,
    total_acertos INTEGER DEFAULT 0,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ano_valido CHECK (ano >= 1900 AND ano <= 2100)
);

-- Criar índices para otimizar buscas
CREATE INDEX idx_questoes_instituicao ON questoes(instituicao);
CREATE INDEX idx_questoes_ano ON questoes(ano);
CREATE INDEX idx_questoes_assunto ON questoes(assunto);
CREATE INDEX idx_questoes_sistema ON questoes(sistema);
CREATE INDEX idx_questoes_tipo ON questoes(tipo_questao);

-- 3. TABELA DE TESTES
CREATE TABLE IF NOT EXISTS testes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_finalizacao TIMESTAMP WITH TIME ZONE,
    modo VARCHAR(20) NOT NULL, -- 'aprendizado' ou 'simulado'
    status VARCHAR(20) DEFAULT 'em_andamento', -- 'em_andamento', 'pausado', 'finalizado'
    tempo_total_segundos INTEGER DEFAULT 0,
    questoes_ids UUID[] NOT NULL, -- Array com IDs das questões do teste
    filtros JSONB, -- JSON com os filtros aplicados para criar o teste
    CONSTRAINT modo_valido CHECK (modo IN ('aprendizado', 'simulado')),
    CONSTRAINT status_valido CHECK (status IN ('em_andamento', 'pausado', 'finalizado'))
);

CREATE INDEX idx_testes_usuario ON testes(usuario_id);
CREATE INDEX idx_testes_status ON testes(status);

-- 4. TABELA DE RESPOSTAS DOS USUÁRIOS
CREATE TABLE IF NOT EXISTS respostas_usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    teste_id UUID NOT NULL REFERENCES testes(id) ON DELETE CASCADE,
    questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    resposta_usuario VARCHAR(10), -- A resposta marcada pelo usuário
    status_resposta CHAR(1) NOT NULL, -- 'C' (correto), 'I' (incorreto), 'B' (em branco)
    tempo_resposta_segundos INTEGER,
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT status_valido CHECK (status_resposta IN ('C', 'I', 'B')),
    UNIQUE(teste_id, questao_id) -- Uma questão só pode ser respondida uma vez por teste
);

CREATE INDEX idx_respostas_usuario ON respostas_usuarios(usuario_id);
CREATE INDEX idx_respostas_teste ON respostas_usuarios(teste_id);
CREATE INDEX idx_respostas_questao ON respostas_usuarios(questao_id);

-- 5. TABELA DE COMENTÁRIOS
CREATE TABLE IF NOT EXISTS comentarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    comentario_texto TEXT NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT comentario_nao_vazio CHECK (LENGTH(TRIM(comentario_texto)) > 0)
);

CREATE INDEX idx_comentarios_questao ON comentarios(questao_id);
CREATE INDEX idx_comentarios_usuario ON comentarios(usuario_id);

-- 6. TABELA DE ESTATÍSTICAS DIÁRIAS DO USUÁRIO (para gráficos)
CREATE TABLE IF NOT EXISTS estatisticas_diarias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    total_questoes INTEGER DEFAULT 0,
    total_corretas INTEGER DEFAULT 0,
    total_incorretas INTEGER DEFAULT 0,
    tempo_total_segundos INTEGER DEFAULT 0,
    UNIQUE(usuario_id, data)
);

CREATE INDEX idx_estatisticas_usuario_data ON estatisticas_diarias(usuario_id, data);
