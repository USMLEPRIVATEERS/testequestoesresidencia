# 🔒 Configurar Políticas RLS para Signup

## ❌ Problema Atual

O signup está falhando com erro:
```
new row violates row-level security policy for table "usuarios"
```

**Causa**: Tentamos inserir na tabela `usuarios` ANTES de criar o usuário no Auth. Como não há usuário autenticado ainda, as políticas RLS bloqueiam a inserção.

---

## ✅ Solução

Aplicar políticas RLS que permitam INSERT público durante o signup, mas com validação de email único.

---

## 📋 Passo a Passo (Supabase Dashboard)

### 1. Acessar o SQL Editor

1. Entre no **Supabase Dashboard**: https://app.supabase.com
2. Selecione seu projeto
3. No menu lateral esquerdo, clique em **SQL Editor**

### 2. Executar o Script SQL

1. Clique em **"+ New query"**
2. Abra o arquivo `supabase-rls-policy.sql` deste repositório
3. **Copie TODO o conteúdo** do arquivo
4. **Cole** no SQL Editor do Supabase
5. Clique em **"Run"** ou pressione `Ctrl + Enter` (Windows/Linux) ou `Cmd + Enter` (Mac)

### 3. Verificar Políticas Criadas

Após executar, você deve ver na parte inferior do editor:

```
✅ Success. No rows returned
```

Isso significa que as políticas foram criadas com sucesso.

Para **confirmar**, execute este comando no SQL Editor:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;
```

Você deve ver 4 políticas:
1. ✅ `Permitir INSERT público durante signup` (INSERT)
2. ✅ `Usuários podem atualizar seus próprios dados` (UPDATE)
3. ✅ `Usuários podem deletar seus próprios dados` (DELETE)
4. ✅ `Usuários podem ler seus próprios dados` (SELECT)

---

## 🔍 O que as Políticas Fazem

### 1. **INSERT** (Signup)
```sql
CREATE POLICY "Permitir INSERT público durante signup"
```
- ✅ Permite inserir se o email ainda não existe
- ✅ Previne duplicatas
- ✅ Necessária para signup funcionar

### 2. **SELECT** (Leitura)
```sql
CREATE POLICY "Usuários podem ler seus próprios dados"
```
- ✅ Usuários autenticados podem ler apenas seus próprios dados
- ✅ Garante privacidade

### 3. **UPDATE** (Atualização)
```sql
CREATE POLICY "Usuários podem atualizar seus próprios dados"
```
- ✅ Usuários autenticados podem atualizar apenas seus próprios dados
- ✅ Previne edição de dados de outros usuários

### 4. **DELETE** (Deleção)
```sql
CREATE POLICY "Usuários podem deletar seus próprios dados"
```
- ✅ Necessária para rollback quando Auth falhar
- ✅ Permite deletar registro temporário se signup falhar

---

## 🛡️ Segurança

### É seguro permitir INSERT público?

**SIM**, porque:

1. ✅ **Valida email único**: A política verifica se o email já existe antes de permitir inserção
2. ✅ **Signup completo depende do Auth**: O signup só é bem-sucedido se AMBOS (tabela + Auth) funcionarem
3. ✅ **Rollback automático**: Se Auth falhar, o registro é deletado da tabela
4. ✅ **Dados sensíveis no Auth**: Senhas são armazenadas apenas no Auth do Supabase (bcrypt)
5. ✅ **Sem privilégios elevados**: Usuários não conseguem inserir dados de outros usuários

### O que a política NÃO permite:

- ❌ Inserir com email duplicado
- ❌ Criar usuários com IDs de outros usuários
- ❌ Acessar dados de outros usuários
- ❌ Atualizar dados de outros usuários

---

## 🧪 Testar Após Aplicar

1. Acesse a página de signup do app
2. Preencha os dados de um novo usuário
3. Clique em "Criar Conta"
4. ✅ O signup deve funcionar sem erros
5. ✅ Você deve ser redirecionado para o dashboard

---

## ❓ Troubleshooting

### Erro: "relation 'usuarios' does not exist"
- **Causa**: A tabela `usuarios` não foi criada
- **Solução**: Crie a tabela primeiro no SQL Editor

### Erro: "permission denied for table usuarios"
- **Causa**: RLS está habilitado mas sem políticas
- **Solução**: Execute o script `supabase-rls-policy.sql`

### Erro: "duplicate policy name"
- **Causa**: Políticas já existem com esses nomes
- **Solução**: O script já remove as antigas antes de criar. Execute novamente.

---

## 📞 Suporte

Se encontrar problemas, verifique:

1. ✅ RLS está habilitado na tabela `usuarios`
2. ✅ Todas as 4 políticas foram criadas
3. ✅ O arquivo `js/auth.js` está com a nova implementação table-first
4. ✅ Console do navegador para mensagens de erro detalhadas

---

## 🔄 Reverter (se necessário)

Para desabilitar INSERT público (voltar ao comportamento anterior):

```sql
DROP POLICY IF EXISTS "Permitir INSERT público durante signup" ON usuarios;

-- Criar política restrita (apenas usuários autenticados)
CREATE POLICY "Usuários podem inserir seus próprios dados"
ON usuarios FOR INSERT
WITH CHECK (auth.uid() = id);
```

⚠️ **AVISO**: Isso fará o signup falhar novamente. Use apenas se voltar para a abordagem Auth-first.
