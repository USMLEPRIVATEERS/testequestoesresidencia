# 🔧 Configurar Database Trigger no Supabase

## Problema Resolvido

O erro de signup duplicado acontecia porque estávamos criando usuários em **dois lugares diferentes**:

1. **Supabase Auth** (sistema de autenticação)
2. **Tabela `usuarios`** (banco de dados com dados adicionais)

Isso criava uma **condição de corrida** onde:
- ✅ Usuário criado no Auth
- ❌ Falha ao inserir na tabela `usuarios` (erro 409/23505)
- 🔁 Usuário clica novamente
- ❌ Erro "User already registered"

## Solução: Database Trigger

Um **trigger automático** garante que sempre que um usuário é criado no Auth, ele é **automaticamente** criado na tabela `usuarios`.

---

## 📋 Passo a Passo

### 1️⃣ Acessar o Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** (ícone de banco de dados no menu lateral)
4. Clique em **+ New Query**

### 2️⃣ Executar o Script SQL

1. Abra o arquivo `database-trigger.sql` deste repositório
2. **Copie TODO o conteúdo** do arquivo
3. **Cole** no SQL Editor do Supabase
4. Clique em **Run** (ou pressione `Ctrl+Enter`)

### 3️⃣ Verificar Instalação

Você deve ver uma mensagem de sucesso. Para confirmar, execute esta query:

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users';
```

**Resultado esperado:**
```
trigger_name            | event_manipulation | event_object_table
-----------------------|-------------------|-------------------
on_auth_user_created   | INSERT            | users
on_auth_user_updated   | UPDATE            | users
```

### 4️⃣ Testar

1. Faça um novo cadastro na aplicação
2. Verifique no banco se o usuário foi criado automaticamente:

```sql
-- Ver últimos usuários criados
SELECT id, email, nome, whatsapp, plano, created_at
FROM usuarios
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ O que o Trigger faz?

1. **Quando um usuário é criado no Auth:**
   - ✅ Automaticamente cria registro na tabela `usuarios`
   - ✅ Define plano como 'free' por padrão
   - ✅ Extrai nome e whatsapp do metadata
   - ✅ Evita duplicatas (usa `ON CONFLICT DO UPDATE`)

2. **Quando um usuário atualiza o email:**
   - ✅ Atualiza automaticamente na tabela `usuarios`
   - ✅ Mantém sincronização entre Auth e tabela

---

## 🔄 Código JavaScript Atualizado

O código JavaScript agora:

1. **Envia dados via metadata:**
   ```javascript
   await supabaseClient.auth.signUp({
     email: email,
     password: password,
     options: {
       data: {
         name: name,
         whatsapp: whatsapp
       }
     }
   });
   ```

2. **Aguarda o trigger criar o registro** (500ms)

3. **Fallback manual:** Se o trigger não estiver configurado, cria manualmente

4. **Sincroniza dados:** Atualiza nome/whatsapp caso necessário

---

## 🚨 Importante

- **Execute o script SQL UMA VEZ** no Supabase
- Se já tiver usuários criados, eles não serão afetados
- Novos usuários serão criados automaticamente
- O código JavaScript tem fallback caso o trigger não esteja configurado

---

## 🐛 Troubleshooting

### Erro: "permission denied for schema auth"

**Solução:** Você precisa ser **owner do projeto** no Supabase ou ter permissões de admin.

### Trigger não está funcionando

1. Verifique se o trigger foi criado:
   ```sql
   SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
   ```

2. Verifique os logs do Supabase:
   - Vá em **Logs** → **Postgres Logs**
   - Procure por mensagens com `NOTICE`

### Usuários antigos sem registro na tabela usuarios

Execute este script para criar registros para usuários que só existem no Auth:

```sql
INSERT INTO usuarios (id, email, nome, plano, created_at)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'Usuário Importado'),
  'free',
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM usuarios)
ON CONFLICT (id) DO NOTHING;
```

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs do Supabase
2. Verifique os logs do console do navegador
3. Abra uma issue no GitHub com os logs

---

## ✨ Benefícios

✅ **Sem erros de duplicate key**
✅ **Sincronização automática**
✅ **Menos código no frontend**
✅ **Mais confiável e robusto**
✅ **Funciona mesmo se trigger falhar** (fallback)

---

**Última atualização:** Dezembro 2024
