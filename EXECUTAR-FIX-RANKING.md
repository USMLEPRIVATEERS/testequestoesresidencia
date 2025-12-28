# 🔧 Fix para o Ranking - Instruções de Execução

## Problema Identificado

O Row Level Security (RLS) do Supabase está bloqueando o acesso às respostas e dados de outros usuários, fazendo com que o ranking mostre apenas suas próprias estatísticas.

## Solução

Foi criado um arquivo SQL que:
1. ✅ Modifica o RLS para permitir leitura de dados públicos de usuários (nome, Instagram)
2. ✅ Cria uma função PostgreSQL otimizada que calcula estatísticas agregadas
3. ✅ Mantém a privacidade (emails e respostas individuais continuam protegidos)

## Como Executar

### Passo 1: Acessar o SQL Editor do Supabase

1. Acesse o dashboard do seu projeto no Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral esquerdo, clique em **SQL Editor**

### Passo 2: Executar o SQL

1. Clique em **"New Query"** (Nova Consulta)
2. Abra o arquivo: `supabase/12-fix-rls-for-ranking.sql`
3. Copie TODO o conteúdo do arquivo
4. Cole no editor SQL do Supabase
5. Clique em **"Run"** (Executar) ou pressione `Ctrl+Enter`

### Passo 3: Verificar Execução

Você deve ver mensagens de sucesso como:
```
DROP POLICY
CREATE POLICY
CREATE FUNCTION
GRANT
```

### Passo 4: Testar o Ranking

1. Recarregue a página do Ranking no seu app
2. Abra o Console do navegador (F12)
3. Verifique os logs mostrando todos os usuários
4. O ranking agora deve mostrar TODOS os usuários e suas estatísticas

## O que Mudou no Código

### JavaScript (`js/ranking.js`)
- ✅ Removidas múltiplas queries individuais
- ✅ Agora usa uma única chamada RPC: `obter_ranking_ultimos_30_dias()`
- ✅ Muito mais eficiente (1 query ao invés de N+1 queries)

### SQL (`supabase/12-fix-rls-for-ranking.sql`)
- ✅ Política RLS atualizada para permitir leitura de dados públicos
- ✅ Função agregada que calcula estatísticas de todos os usuários
- ✅ SECURITY DEFINER usado de forma segura (sem expor dados privados)

## Segurança Mantida

✅ **Emails** continuam privados
✅ **Respostas individuais** continuam privadas
✅ Apenas **estatísticas agregadas** são expostas (totais, porcentagens)
✅ **Nome e Instagram** são públicos no ranking (como esperado)

## Benefícios

- 🚀 **Performance**: 1 query ao invés de dezenas
- 🔒 **Segurança**: Dados sensíveis continuam protegidos
- 👥 **Ranking completo**: Todos os usuários visíveis
- 📊 **Estatísticas corretas**: Mostra dados reais de todos

## Troubleshooting

### Erro: "function obter_ranking_ultimos_30_dias() does not exist"
- Certifique-se de ter executado o SQL completamente
- Verifique se não houve erros durante a execução

### Erro: "permission denied for function"
- Execute o comando GRANT novamente:
```sql
GRANT EXECUTE ON FUNCTION obter_ranking_ultimos_30_dias() TO authenticated;
```

### Ranking ainda mostra apenas meus dados
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique o console se há erros
- Verifique se o SQL foi executado com sucesso

## Suporte

Se tiver problemas, abra o Console do navegador (F12) e copie os logs/erros que aparecem.
