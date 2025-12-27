# 🔧 Troubleshooting - Soluções para Problemas Comuns

## 🚫 Problemas de Autenticação

### ❌ "Invalid login credentials" ao tentar fazer login
**Causa:** Email ou senha incorretos

**Soluções:**
1. Verifique se digitou email e senha corretamente
2. Tente redefinir a senha
3. Verifique no Supabase se o usuário foi criado:
   - Vá em **Authentication** > **Users**
   - Procure o email

### ❌ Não recebo email de confirmação
**Causa:** Emails de confirmação estão habilitados mas não configurados

**Solução:**
1. Vá em **Authentication** > **Email Templates**
2. Configure o serviço de email OU
3. Desabilite confirmação de email:
   - **Authentication** > **Providers** > **Email**
   - Desmarque "Confirm email"

### ❌ "User already registered" mas não consigo fazer login
**Causa:** Usuário criado mas senha incorreta ou email não confirmado

**Solução:**
1. Use a opção "Esqueci minha senha" (se configurado)
2. OU delete o usuário no Supabase e recrie:
   - **Authentication** > **Users**
   - Encontre o usuário e delete
   - Registre novamente

---

## 🌐 Problemas de Conexão

### ❌ "Failed to fetch" ou erro de CORS
**Causa:** Tentando abrir o arquivo HTML diretamente no navegador

**Solução:**
Você DEVE usar um servidor HTTP. Escolha uma opção:

**Opção 1: VS Code Live Server**
```
1. Instale extensão "Live Server"
2. Clique direito em index.html
3. "Open with Live Server"
```

**Opção 2: Python**
```bash
python -m http.server 8000
# Acesse: http://localhost:8000
```

**Opção 3: Node.js**
```bash
npx serve
# Acesse a URL que aparecer
```

### ❌ "Invalid API key" ou "Invalid project ref"
**Causa:** Credenciais incorretas no config.js

**Solução:**
1. Abra `js/config.js`
2. Verifique se copiou as credenciais corretamente:
   - **Project Settings** > **API** no Supabase
   - Copie **Project URL** e **anon public key**
3. Cole EXATAMENTE como estão, com https:// e tudo
4. Salve o arquivo
5. Recarregue a página (Ctrl+F5)

---

## 🗄️ Problemas com Banco de Dados

### ❌ "relation 'questoes' does not exist"
**Causa:** Tabelas não foram criadas

**Solução:**
1. Vá no **SQL Editor** do Supabase
2. Execute os scripts NA ORDEM:
   - `00-setup-auth.sql`
   - `01-create-tables.sql`
   - `02-create-functions.sql`
   - `03-row-level-security.sql`
3. Verifique se não há erros em vermelho

### ❌ "permission denied for table questoes"
**Causa:** Row Level Security (RLS) está bloqueando acesso

**Solução:**
1. Execute o script `03-row-level-security.sql` completamente
2. Verifique se está logado (token de autenticação válido)
3. Faça logout e login novamente

### ❌ Nenhuma questão aparece ao criar teste
**Causa:** Não há questões cadastradas no banco

**Solução:**
1. Execute `04-sample-data.sql` para adicionar questões de exemplo
2. OU adicione questões manualmente via SQL Editor:
```sql
INSERT INTO questoes (...) VALUES (...);
```
3. Verifique se há questões:
```sql
SELECT COUNT(*) FROM questoes;
```

---

## 📊 Problemas com Dashboard

### ❌ Estatísticas aparecem como "0" ou "-"
**Causa:** Ainda não há dados de testes/respostas

**Solução:**
1. Faça pelo menos um teste completo
2. Aguarde algumas horas para estatísticas agregarem
3. Verifique se há respostas no banco:
```sql
SELECT COUNT(*) FROM respostas_usuarios;
```

### ❌ Gráfico não aparece ou está vazio
**Causa:** Não há dados suficientes OU Chart.js não carregou

**Solução:**
1. Verifique se Chart.js está carregando:
   - Abra Console do navegador (F12)
   - Procure por erros relacionados a Chart
2. Faça mais testes para gerar dados
3. Aguarde 24h para dados aparecerem no gráfico diário
4. Tente trocar para visualização "Semanal" ou "Mensal"

### ❌ "Provas selecionadas" vazio
**Causa:** Usuário ainda não selecionou provas

**Solução:**
1. No Dashboard, clique em "Editar Provas"
2. Marque as provas que quer estudar
3. Clique em "Salvar"

---

## 🧪 Problemas ao Fazer Testes

### ❌ Não consigo selecionar alternativa
**Causa:** JavaScript pode não estar carregando

**Solução:**
1. Abra Console (F12) e veja se há erros
2. Verifique se todos arquivos .js estão sendo carregados
3. Limpe cache do navegador (Ctrl+Shift+Del)
4. Recarregue a página (Ctrl+F5)

### ❌ "Ver Resposta" não mostra gabarito
**Causa:** Você não selecionou uma alternativa primeiro

**Solução:**
1. Clique em uma das alternativas
2. Depois clique em "Ver Resposta"

### ❌ Botão "Finalizar" não funciona
**Causa:** Pode haver erro ao salvar no banco

**Solução:**
1. Abra Console (F12) e veja o erro
2. Verifique conexão com internet
3. Tente pausar o teste e retomar depois
4. Verifique se o Supabase está online: https://status.supabase.com

### ❌ Tempo do teste não aparece
**Causa:** Timer não iniciou corretamente

**Solução:**
1. Recarregue a página do teste
2. Verifique Console (F12) por erros JavaScript

---

## 💾 Problemas com Dados

### ❌ Minhas respostas não estão sendo salvas
**Causa:** Erro na comunicação com Supabase

**Solução:**
1. Verifique conexão com internet
2. Abra Console (F12) e veja erros
3. Verifique se políticas RLS estão corretas
4. Tente fazer logout e login novamente

### ❌ Comentários não aparecem
**Causa:** Tabela de comentários não foi criada OU RLS bloqueando

**Solução:**
1. Verifique se executou todos os scripts SQL
2. Execute esta query no SQL Editor:
```sql
SELECT * FROM comentarios;
```
3. Se der erro, recrie a tabela executando `01-create-tables.sql` novamente

---

## 🎨 Problemas Visuais

### ❌ Layout quebrado ou desformatado
**Causa:** CSS não está carregando

**Solução:**
1. Verifique se arquivo `css/styles.css` existe
2. Abra Console (F12) > Aba Network
3. Procure por erros 404 (arquivos não encontrados)
4. Limpe cache (Ctrl+Shift+Del) e recarregue

### ❌ Fontes ou cores estranhas
**Causa:** Variáveis CSS não definidas

**Solução:**
1. Abra `css/styles.css`
2. Verifique se o bloco `:root` existe no início
3. Se necessário, recrie o arquivo

---

## 🔍 Como Investigar Erros

### Passo 1: Abrir Console do Navegador
1. Pressione **F12** (ou Ctrl+Shift+I)
2. Vá na aba **Console**
3. Procure mensagens em vermelho (erros)
4. Copie a mensagem de erro

### Passo 2: Verificar Network
1. Na aba **Network** (Rede)
2. Recarregue a página
3. Procure por requisições em vermelho (falhas)
4. Clique nelas para ver detalhes

### Passo 3: Verificar Logs do Supabase
1. No painel do Supabase
2. Vá em **Logs** > **API Logs**
3. Procure por erros recentes
4. Verifique mensagens de erro

### Passo 4: Testar Queries SQL
1. Vá em **SQL Editor**
2. Execute queries simples para testar:
```sql
-- Testar se tabelas existem
SELECT * FROM questoes LIMIT 1;
SELECT * FROM usuarios LIMIT 1;
SELECT * FROM testes LIMIT 1;

-- Verificar políticas RLS
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🆘 Checklist de Diagnóstico Completo

Se nada funciona, siga esta checklist:

- [ ] Credenciais corretas em `js/config.js`?
- [ ] Todos scripts SQL executados sem erro?
- [ ] Autenticação habilitada no Supabase?
- [ ] RLS configurado corretamente?
- [ ] Usando servidor HTTP (não abrindo HTML direto)?
- [ ] Console do navegador sem erros?
- [ ] Internet funcionando?
- [ ] Supabase online? (https://status.supabase.com)
- [ ] Fez logout/login recentemente?
- [ ] Limpou cache do navegador?

---

## 📞 Última Opção: Reset Completo

Se NADA funcionar, faça um reset:

### 1. Limpar Banco de Dados
```sql
-- NO SQL EDITOR DO SUPABASE
DROP TABLE IF EXISTS comentarios CASCADE;
DROP TABLE IF EXISTS respostas_usuarios CASCADE;
DROP TABLE IF EXISTS estatisticas_diarias CASCADE;
DROP TABLE IF EXISTS testes CASCADE;
DROP TABLE IF EXISTS questoes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
```

### 2. Recriar Tudo
1. Execute scripts na ordem:
   - `00-setup-auth.sql`
   - `01-create-tables.sql`
   - `02-create-functions.sql`
   - `03-row-level-security.sql`
   - `04-sample-data.sql`

### 3. Limpar Frontend
1. Limpe cache do navegador
2. Delete arquivo `js/config.js`
3. Copie `js/config.example.js` para `js/config.js`
4. Configure credenciais novamente
5. Recarregue tudo (Ctrl+Shift+R)

---

## 💡 Dicas de Prevenção

1. **Sempre use HTTPS** ao acessar o site em produção
2. **Faça backup** das questões regularmente
3. **Não compartilhe** suas credenciais do Supabase
4. **Use git** para versionar o código (sem config.js)
5. **Teste em modo anônimo** do navegador se algo estranho acontecer

---

Se após tudo isso ainda tiver problemas, verifique:
- Versão do navegador (use Chrome/Firefox atualizados)
- Firewall/Antivírus bloqueando conexão
- Proxy/VPN interferindo

Boa sorte! 🍀
