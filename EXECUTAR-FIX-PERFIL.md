# 🔧 Fix para Visualização de Perfis - Instruções

## Problema

Ao clicar no nome de um usuário no ranking para ver o perfil, os dados não carregavam. O RLS bloqueava acesso às respostas e testes de outros usuários.

## Solução

Criei 5 funções SQL que permitem visualização pública de perfis de forma segura:

1. ✅ `obter_estatisticas_perfil(usuario_id)` - Estatísticas gerais (todos os tempos)
2. ✅ `obter_estatisticas_perfil_periodo(usuario_id, dias)` - Estatísticas por período
3. ✅ `obter_estatisticas_por_assunto(usuario_id, dias)` - Top 10 assuntos
4. ✅ `obter_atividade_recente(usuario_id)` - Últimos 5 testes finalizados
5. ✅ `obter_posicao_ranking(usuario_id)` - Posição no ranking

## Como Executar

1. Acesse: https://supabase.com/dashboard → Seu projeto → **SQL Editor**
2. Clique em **"New Query"**
3. Abra o arquivo: **`supabase/13-fix-rls-for-perfil.sql`**
4. Copie **TODO** o conteúdo
5. Cole no SQL Editor do Supabase
6. Clique **"Run"** (Ctrl+Enter)

## O Que Vai Acontecer

Você verá várias mensagens:
```
DROP FUNCTION (5x)
CREATE FUNCTION (5x)
GRANT (5x)
```

## Testar

1. Acesse a página de **Ranking**
2. Clique no **nome de qualquer usuário**
3. A página de perfil deve carregar com:
   - ✅ Nome e avatar
   - ✅ Links sociais (Instagram, WhatsApp)
   - ✅ Estatísticas (questões, acertos, porcentagem)
   - ✅ Posição no ranking
   - ✅ Conquistas/badges
   - ✅ Estatísticas por assunto
   - ✅ Atividade recente (últimos testes)

## Segurança Mantida

✅ **Respostas individuais** continuam privadas
✅ **Testes individuais** continuam privados
✅ **Emails** continuam privados
✅ Apenas **estatísticas agregadas** são públicas
✅ **Nome, Instagram, WhatsApp** são públicos (como esperado em perfil social)

## Benefícios

- 🚀 **Performance**: Queries SQL otimizadas ao invés de múltiplas chamadas
- 🔒 **Segurança**: Dados sensíveis protegidos
- 👥 **Social**: Usuários podem ver perfis uns dos outros
- 📊 **Completo**: Todas as estatísticas funcionando

## Troubleshooting

### Erro: "function X does not exist"
- Certifique-se de ter executado o SQL completamente
- Verifique se não houve erros durante a execução

### Perfil ainda não carrega
- Abra o Console do navegador (F12)
- Copie os erros que aparecem
- Limpe o cache (Ctrl+Shift+R)

### Erro: "permission denied"
- Execute os comandos GRANT novamente:
```sql
GRANT EXECUTE ON FUNCTION obter_estatisticas_perfil(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION obter_estatisticas_perfil_periodo(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION obter_estatisticas_por_assunto(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION obter_atividade_recente(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION obter_posicao_ranking(UUID) TO authenticated;
```

## O Que Foi Modificado

### SQL (`supabase/13-fix-rls-for-perfil.sql`)
- 5 funções PostgreSQL com `SECURITY DEFINER`
- Bypass RLS de forma segura
- Retornam apenas dados agregados/públicos

### JavaScript (`js/perfil.js`)
- Substituídas queries diretas por chamadas RPC
- `carregarEstatisticas()` usa `.rpc('obter_estatisticas_perfil_periodo')`
- `carregarPosicaoRanking()` usa `.rpc('obter_posicao_ranking')`
- `carregarEstatisticasPorAssunto()` usa `.rpc('obter_estatisticas_por_assunto')`
- `carregarAtividadeRecente()` usa `.rpc('obter_atividade_recente')`
- Muito mais eficiente e funcionando com RLS ativo
