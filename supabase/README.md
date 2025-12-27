# Scripts SQL do Supabase - Ordem de Execução

Este diretório contém os scripts SQL necessários para configurar o banco de dados do projeto Questões Residência no Supabase.

## ⚠️ IMPORTANTE - Se você já executou os scripts anteriormente

Se você já executou os scripts SQL originais e está encontrando erros de autenticação, **EXECUTE OS SCRIPTS DE CORREÇÃO NA ORDEM**:

### Correção Urgente (se já tem o banco configurado):

**Passo 1**: Corrigir estrutura da tabela
```sql
-- Execute ESTE arquivo primeiro para corrigir a estrutura:
07-fix-usuarios-table.sql
```

Este script irá:
- ✅ Remover a coluna `senha_hash` (incompatível com Supabase Auth)
- ✅ Adicionar as colunas `whatsapp` e `instagram`
- ✅ Adicionar validações e índices necessários

**Passo 2**: Corrigir políticas RLS
```sql
-- Execute ESTE arquivo em seguida para permitir INSERT:
08-fix-rls-usuarios-insert.sql
```

Este script irá:
- ✅ Adicionar política de INSERT (permite criar conta durante signup)
- ✅ Atualizar política de SELECT (permite ver ranking de outros usuários)
- ✅ Verificar que todas as políticas foram criadas corretamente

**Depois de executar AMBOS os scripts, a criação de contas deve funcionar normalmente.**

**Passo 3 (OPCIONAL)**: Nunca repetir questões já respondidas
```sql
-- Execute este arquivo se quiser que questões nunca se repitam:
09-fix-questoes-nao-respondidas.sql
```

Este script irá:
- ✅ Atualizar função `obter_questoes_nao_respondidas`
- ✅ Remover questões já respondidas (mesmo de testes finalizados)
- ✅ Garantir que você sempre faça questões novas

**OBS**: Se você quiser refazer questões antigas, use o botão "Refazer Teste" em "Testes Anteriores".

---

## 📋 Ordem de Execução - Instalação Nova

Se você está configurando o banco pela primeira vez, execute os scripts nesta ordem:

### 1. Setup Inicial
```sql
00-setup-auth.sql
```
Configura as políticas de autenticação do Supabase.

### 2. Criar Tabelas
```sql
01-create-tables.sql
```
⚠️ **ATENÇÃO**: Este script original tem um erro - ele cria a coluna `senha_hash` que é incompatível com Supabase Auth. Você pode pular este script e usar diretamente o script de correção (07-fix-usuarios-table.sql) após criar a estrutura básica.

### 3. Funções do Banco
```sql
02-create-functions.sql
```
Cria funções auxiliares para o banco de dados.

### 4. Row Level Security (RLS)
```sql
03-row-level-security.sql
```
Configura políticas de segurança de acesso aos dados.

### 5. Correção da Estrutura (IMPORTANTE!)
```sql
07-fix-usuarios-table.sql
```
**Este é o script mais importante!** Ele corrige a tabela usuarios para funcionar com Supabase Auth e adiciona os campos sociais.

### 6. Dados de Exemplo (Opcional)
```sql
04-sample-data.sql
```
Insere dados de exemplo para testes. Execute apenas se quiser dados de teste.

### 7. Migração de Imagens (Se necessário)
```sql
05-migration-add-images.sql
```
Adiciona suporte a imagens nas questões. Execute apenas se você criou o banco antes desta feature existir.

### 8. Nunca Repetir Questões (OPCIONAL mas Recomendado)
```sql
09-fix-questoes-nao-respondidas.sql
```
**Recomendado!** Atualiza a função para nunca mostrar questões já respondidas. Garante que você sempre faça questões novas em "Novo Teste".

---

## 🔍 Explicação do Problema

### Por que `senha_hash` causa erro?

O Supabase Auth gerencia toda a autenticação automaticamente:
- Quando você usa `supabaseClient.auth.signUp()`, o Supabase cria um usuário na tabela interna `auth.users`
- As senhas são criptografadas e armazenadas automaticamente por ele
- Nossa tabela `usuarios` é apenas para dados **complementares** (nome, WhatsApp, Instagram, etc.)
- O campo `id` da tabela `usuarios` referencia o `id` gerado pelo Supabase Auth

Se tentarmos ter um campo `senha_hash NOT NULL` na nossa tabela `usuarios`, o INSERT falhará porque:
1. Não enviamos o `senha_hash` no INSERT (correto)
2. Mas a coluna exige NOT NULL (erro de design)

### Solução

O script `07-fix-usuarios-table.sql` remove essa coluna e adiciona os campos corretos.

---

## 🚀 Como Executar os Scripts

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie e cole o conteúdo do script
5. Clique em **Run** ou pressione `Ctrl+Enter`
6. Verifique as mensagens de sucesso/erro

---

## ✅ Checklist Pós-Configuração

Após executar os scripts, verifique:

- [ ] Tabela `usuarios` existe
- [ ] Coluna `senha_hash` **NÃO** existe (foi removida)
- [ ] Colunas `whatsapp` e `instagram` existem
- [ ] Consegue criar conta no aplicativo sem erros
- [ ] RLS (Row Level Security) está ativo nas tabelas
- [ ] Políticas de acesso estão funcionando

---

## 🆘 Troubleshooting

### Erro: "new row violates row-level security policy for table usuarios" (403)
**Causa**: As políticas RLS não permitem INSERT na tabela usuarios
**Solução**: Execute o script `08-fix-rls-usuarios-insert.sql`

### Erro: "Database error saving new user" (500)
**Causa**: Coluna `senha_hash NOT NULL` incompatível com Supabase Auth
**Solução**: Execute o script `07-fix-usuarios-table.sql`

### Erro: "relation usuarios does not exist"
**Causa**: Tabela ainda não foi criada
**Solução**: Execute `01-create-tables.sql` primeiro, depois `07-fix-usuarios-table.sql` e `08-fix-rls-usuarios-insert.sql`

### Erro: "column whatsapp does not exist"
**Causa**: Migração de campos sociais não foi executada
**Solução**: Execute o script `07-fix-usuarios-table.sql`

### Erro: "duplicate key value violates unique constraint"
**Causa**: Email já está cadastrado no banco
**Solução**: Use outro email ou delete o usuário existente via SQL Editor

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. As mensagens de erro no console do navegador
2. Os logs do Supabase (SQL Editor > Logs)
3. Se as credenciais em `js/config.js` estão corretas
