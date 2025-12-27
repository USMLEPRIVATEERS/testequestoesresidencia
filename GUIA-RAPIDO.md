# 🚀 GUIA RÁPIDO - Questões Residência

## ⚡ Primeiros Passos (5 minutos)

### 1️⃣ Criar Conta no Supabase (2 min)
1. Acesse: https://supabase.com
2. Clique em "Start your project"
3. Crie uma conta (pode usar Google/GitHub)
4. Clique em "New Project"
5. Preencha:
   - Nome do projeto: `questoes-residencia`
   - Database Password: crie uma senha forte (guarde!)
   - Region: escolha o mais próximo (South America - São Paulo)
6. Clique em "Create new project"
7. **Aguarde 1-2 minutos** enquanto o projeto é criado

### 2️⃣ Copiar Credenciais (1 min)
1. No menu lateral, clique em ⚙️ **Settings**
2. Clique em **API**
3. Copie dois valores:
   - **Project URL** (algo como: `https://xxxxx.supabase.co`)
   - **anon public** key (uma chave longa)

### 3️⃣ Configurar Frontend (1 min)
1. Abra o arquivo: `js/config.js`
2. Cole suas credenciais:
```javascript
const SUPABASE_URL = 'https://seu-projeto.supabase.co'; // Cole aqui
const SUPABASE_ANON_KEY = 'sua-chave-anonima-super-longa'; // Cole aqui
```
3. Salve o arquivo (Ctrl+S)

### 4️⃣ Criar Tabelas no Banco (1 min)
1. No Supabase, clique em 🗄️ **SQL Editor** (menu lateral)
2. Clique em **+ New query**
3. Abra o arquivo `supabase/01-create-tables.sql`
4. Copie TODO o conteúdo
5. Cole no SQL Editor do Supabase
6. Clique em **RUN** (canto inferior direito)
7. Deve aparecer "Success. No rows returned"

**Repita os passos 2-6 para os arquivos:**
- `supabase/00-setup-auth.sql`
- `supabase/02-create-functions.sql`
- `supabase/03-row-level-security.sql`
- `supabase/04-sample-data.sql` (opcional - adiciona 5 questões de exemplo)

### 5️⃣ Configurar Autenticação (30 seg)
1. No Supabase, clique em 🔐 **Authentication** (menu lateral)
2. Clique em **Providers**
3. Encontre **Email** e clique para expandir
4. **Habilite** a opção "Enable Email provider"
5. **DESABILITE** a opção "Confirm email" (para facilitar testes)
6. Clique em **Save**

### 6️⃣ Executar o Site (30 seg)

**Opção A: VS Code (mais fácil)**
1. Abra a pasta no VS Code
2. Instale a extensão "Live Server"
3. Clique com botão direito em `index.html`
4. Escolha "Open with Live Server"
5. Seu navegador abrirá automaticamente!

**Opção B: Python (se tiver instalado)**
1. Abra terminal na pasta do projeto
2. Execute:
```bash
python -m http.server 8000
```
3. Acesse: http://localhost:8000

**Opção C: Node.js (se tiver instalado)**
1. Abra terminal na pasta do projeto
2. Execute:
```bash
npx serve
```
3. Acesse a URL que aparecer

---

## ✅ Pronto! Agora você pode:

1. **Criar uma conta** na tela de registro
2. **Fazer login**
3. **Ver o dashboard** (ainda sem dados)
4. **Criar um teste** (se adicionou as questões de exemplo)
5. **Fazer questões** e ver seu progresso!

---

## 📝 Próximos Passos

### Adicionar Questões Reais

Você precisa adicionar questões ao banco de dados. Há duas formas:

**Forma 1: Manualmente via SQL Editor**
```sql
INSERT INTO questoes (
    instituicao, processo_seletivo, ano, assunto, sistema,
    categoria, topico, subtopico, tipo_questao, questao_texto,
    alternativas, gabarito, resolucao_comentada
) VALUES (
    'USP', 'Residência Médica USP', 2024, 'Cardiologia',
    'Cardiovascular', 'Clínica Médica', 'ICC', 'Diagnóstico',
    'multipla_escolha',
    'Paciente de 65 anos com dispneia...',
    '[
        {"letra": "A", "texto": "Radiografia"},
        {"letra": "B", "texto": "Ecocardiograma"},
        {"letra": "C", "texto": "ECG"},
        {"letra": "D", "texto": "Teste ergométrico"},
        {"letra": "E", "texto": "Holter"}
    ]'::jsonb,
    'B',
    'O ecocardiograma é o exame padrão-ouro...'
);
```

**Forma 2: Importar de CSV/Excel**
1. Crie uma planilha com as colunas
2. No Supabase: **Table Editor** > **questoes**
3. Clique em **Import data via spreadsheet**
4. Cole seus dados

---

## 🐛 Problemas?

### Erro: "Failed to fetch"
- ✅ Certifique-se de usar um servidor HTTP (não abrir o HTML direto)
- ✅ Verifique se as credenciais em `config.js` estão corretas

### Não consigo fazer login
- ✅ Verifique se desabilitou "Confirm email" no Supabase
- ✅ Confira se executou os scripts SQL na ordem correta

### Gráficos não aparecem
- ✅ Você precisa fazer alguns testes primeiro para gerar dados
- ✅ Aguarde 24h para aparecer no gráfico diário

### Nenhuma questão aparece
- ✅ Execute o arquivo `04-sample-data.sql` para adicionar questões de exemplo
- ✅ Ou adicione questões manualmente

---

## 📞 Checklist Final

- [ ] Projeto criado no Supabase
- [ ] Credenciais copiadas para `config.js`
- [ ] Todos os scripts SQL executados sem erro
- [ ] Autenticação por email habilitada
- [ ] Site rodando em servidor HTTP local
- [ ] Conta criada e login funcionando
- [ ] Questões adicionadas ao banco

Se marcou todos ✅, parabéns! Seu QBank está funcionando! 🎉

---

## 💡 Dicas

- **Organize suas questões**: Use bem os campos de filtro (assunto, sistema, categoria, etc)
- **Adicione resoluções**: Sempre preencha o campo de resolução comentada
- **Teste regularmente**: Faça testes diários para acompanhar progresso
- **Use comentários**: Comente questões difíceis para revisar depois
- **Modo Aprendizado**: Melhor para estudar novo conteúdo
- **Modo Simulado**: Melhor para testar conhecimento antes das provas

Bons estudos! 📚🩺
