# QUESTÕES RESIDÊNCIA - QBank Médico

Sistema completo de banco de questões para residência médica com frontend em HTML/CSS/JavaScript e backend no Supabase.

## 📋 Funcionalidades

- ✅ Sistema de autenticação (login e registro)
- ✅ Dashboard com métricas de desempenho
- ✅ Gráficos interativos de progresso (diário, semanal, mensal)
- ✅ Criação de testes com filtros avançados
- ✅ Dois modos de teste: Aprendizado e Simulado
- ✅ **Suporte a imagens nas questões** (múltiplas imagens por questão)
- ✅ Navegação entre questões com menu lateral
- ✅ Sistema de comentários em questões
- ✅ Histórico de testes anteriores
- ✅ Possibilidade de refazer testes
- ✅ Tracking automático de estatísticas

## 🚀 Configuração do Projeto

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Anote a **URL do projeto** e a **chave anônima** (anon key)
4. Você encontra essas informações em: `Project Settings > API`

### 2. Configurar Banco de Dados

Execute os scripts SQL no Supabase na ordem abaixo:

1. **Criar Tabelas**: Execute o arquivo `supabase/01-create-tables.sql`
   - Acesse: `SQL Editor` no Supabase
   - Cole o conteúdo do arquivo
   - Clique em "Run"

2. **Criar Funções**: Execute o arquivo `supabase/02-create-functions.sql`
   - Repita o processo acima

3. **Configurar Segurança**: Execute o arquivo `supabase/03-row-level-security.sql`
   - Importante para proteger os dados dos usuários

4. **(Opcional) Dados de Exemplo**: Execute o arquivo `supabase/04-sample-data.sql`
   - Este arquivo contém 5 questões de exemplo para teste

### 3. Configurar Autenticação no Supabase

1. Vá em `Authentication > Providers`
2. Habilite o provedor **Email**
3. Configure as opções:
   - **Enable Email Confirmations**: Desabilite (para facilitar testes)
   - **Enable Email Signup**: Habilite
   - **Minimum Password Length**: 6

### 4. Configurar o Frontend

1. Abra o arquivo `js/config.js`

2. Substitua as variáveis com suas credenciais do Supabase:

```javascript
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anonima-aqui';
```

3. Salve o arquivo

### 5. Executar o Projeto

**Opção 1: Usando um servidor local (Recomendado)**

Você precisa servir os arquivos através de um servidor HTTP (não pode abrir direto no navegador devido ao CORS).

- **Python 3**:
  ```bash
  python -m http.server 8000
  ```

- **Node.js (npx)**:
  ```bash
  npx serve
  ```

- **VS Code**: Instale a extensão "Live Server" e clique com botão direito em `index.html` > "Open with Live Server"

Depois acesse: `http://localhost:8000` (ou a porta que aparecer)

**Opção 2: Hospedagem gratuita**

Você pode hospedar gratuitamente em:
- [GitHub Pages](https://pages.github.com/)
- [Netlify](https://www.netlify.com/)
- [Vercel](https://vercel.com/)

## 📁 Estrutura do Projeto

```
QUESTOES RESIDENCIA/
├── index.html                 # Página de login/registro
├── dashboard.html             # Dashboard com métricas
├── criar-teste.html          # Criação de novo teste
├── teste.html                # Execução do teste
├── testes-anteriores.html    # Histórico de testes
├── css/
│   └── styles.css            # Estilos globais
├── js/
│   ├── config.js             # Configuração do Supabase
│   ├── utils.js              # Funções utilitárias
│   ├── auth.js               # Autenticação
│   ├── dashboard.js          # Lógica do dashboard
│   ├── criar-teste.js        # Lógica de criação de teste
│   ├── teste.js              # Lógica de execução do teste
│   └── testes-anteriores.js  # Lógica de testes anteriores
└── supabase/
    ├── 01-create-tables.sql       # Criação de tabelas
    ├── 02-create-functions.sql    # Funções e triggers
    ├── 03-row-level-security.sql  # Políticas de segurança
    └── 04-sample-data.sql         # Dados de exemplo
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

1. **usuarios**
   - Armazena dados dos usuários
   - Campos: id, email, nome, provas_selecionadas

2. **questoes**
   - Banco de questões
   - Campos: instituição, processo_seletivo, ano, assunto, sistema, categoria, tópico, subtópico, tipo_questao, questao_texto, **imagens_urls (array de URLs)**, alternativas (JSON), gabarito, resolucao_comentada

3. **testes**
   - Testes criados pelos usuários
   - Campos: usuario_id, modo (aprendizado/simulado), status, questoes_ids (array), filtros (JSON), tempo_total

4. **respostas_usuarios**
   - Respostas dadas em cada teste
   - Campos: usuario_id, teste_id, questao_id, resposta_usuario, status_resposta (C/I/B), tempo_resposta

5. **estatisticas_diarias**
   - Estatísticas agregadas por dia
   - Campos: usuario_id, data, total_questoes, total_corretas, total_incorretas, tempo_total

6. **comentarios**
   - Comentários dos usuários em questões
   - Campos: usuario_id, questao_id, comentario_texto, data_criacao

## 📊 Como Adicionar Questões

As questões devem ser inseridas diretamente no Supabase. Exemplo de INSERT:

```sql
INSERT INTO questoes (
    instituicao,
    processo_seletivo,
    ano,
    assunto,
    sistema,
    categoria,
    topico,
    subtopico,
    tipo_questao,
    questao_texto,
    imagens_urls,  -- Array de URLs de imagens (use '{}' se não tiver imagens)
    alternativas,
    gabarito,
    resolucao_comentada
) VALUES (
    'USP',
    'Residência Médica USP',
    2024,
    'Cardiologia',
    'Cardiovascular',
    'Clínica Médica',
    'Insuficiência Cardíaca',
    'Diagnóstico',
    'multipla_escolha',
    'Texto da questão aqui...',
    '{}',  -- Sem imagens OU '{"https://i.imgur.com/imagem.jpg"}' com imagem
    '[
        {"letra": "A", "texto": "Alternativa A"},
        {"letra": "B", "texto": "Alternativa B"},
        {"letra": "C", "texto": "Alternativa C"},
        {"letra": "D", "texto": "Alternativa D"},
        {"letra": "E", "texto": "Alternativa E"}
    ]'::jsonb,
    'B',
    'Explicação detalhada da resposta correta...'
);
```

### 🖼️ Como Adicionar Imagens

**Veja o guia completo:** [COMO-ADICIONAR-IMAGENS.md](COMO-ADICIONAR-IMAGENS.md)

**Resumo rápido:**
1. Faça upload da imagem em um serviço gratuito (Imgur, ImgBB, etc)
2. Copie a URL direta da imagem
3. Adicione no campo `imagens_urls`:
   - Uma imagem: `'{"https://i.imgur.com/sua-imagem.jpg"}'`
   - Múltiplas: `'{"https://i.imgur.com/img1.jpg", "https://i.imgur.com/img2.jpg"}'`

Você também pode criar uma planilha Excel/CSV e importar em massa usando o Supabase Table Editor.

## 🎯 Fluxo de Uso do Sistema

1. **Registro/Login**: Usuário cria conta ou faz login
2. **Dashboard**: Visualiza suas estatísticas e desempenho
3. **Criar Teste**: Seleciona filtros e quantidade de questões
4. **Executar Teste**: Responde questões em modo aprendizado ou simulado
5. **Ver Resultados**: Analisa desempenho e revisa questões
6. **Testes Anteriores**: Pode refazer testes antigos

## 🔒 Segurança

O sistema utiliza Row Level Security (RLS) do Supabase para garantir que:
- Usuários só vejam seus próprios dados
- Questões são visíveis para todos usuários autenticados
- Respostas e testes são privados de cada usuário
- Comentários são públicos mas só podem ser editados pelo autor

## 🎨 Personalização

### Alterar Cores

Edite as variáveis CSS em `css/styles.css`:

```css
:root {
    --primary-color: #000000;
    --secondary-color: #333333;
    --background-color: #FFFFFF;
    /* ... */
}
```

### Alterar Limite de Questões por Teste

Edite `js/config.js`:

```javascript
const CONFIG = {
    MAX_QUESTOES_POR_TESTE: 100, // Altere este valor
};
```

## 📝 Funcionalidades Futuras (Sugestões)

- [ ] Sistema de favoritos de questões
- [ ] Anotações pessoais em questões
- [ ] Geração de PDF com testes
- [ ] Estatísticas por assunto/sistema
- [ ] Ranking entre usuários (opcional)
- [ ] Sistema de flashcards
- [ ] Modo escuro
- [ ] Aplicativo mobile (PWA)

## 🐛 Problemas Comuns

**Erro de CORS ao abrir index.html**
- Solução: Use um servidor HTTP local (veja seção "Executar o Projeto")

**Usuário não consegue fazer login após registro**
- Verifique se desabilitou "Email Confirmations" no Supabase

**Gráficos não aparecem**
- Certifique-se de que o Chart.js está carregando corretamente
- Verifique se há dados de estatísticas para o período selecionado

**Questões não aparecem**
- Confirme que executou todos os scripts SQL
- Verifique se há questões cadastradas no banco

## 📧 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console do navegador (F12)
2. Verifique os logs do Supabase em `Logs` > `API Logs`
3. Revise a configuração das credenciais em `config.js`

## 📄 Licença

Este projeto é de uso livre para fins educacionais e pessoais.

---

**Desenvolvido para auxiliar estudantes de medicina na preparação para provas de residência médica.**

Bons estudos! 🩺📚
