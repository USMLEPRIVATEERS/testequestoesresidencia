# 🚀 Deploy para 20k Usuários - Guia Completo

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Otimizações de Banco de Dados](#otimizações-de-banco-de-dados)
3. [Otimizações de Frontend](#otimizações-de-frontend)
4. [Configuração de Infraestrutura](#configuração-de-infraestrutura)
5. [Monitoramento](#monitoramento)
6. [Custos Estimados](#custos-estimados)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Pré-requisitos

### Plano do Supabase
- ✅ **Migrar para Supabase Pro** ($25/mês)
- Motivo: Plano free tem limite de 500MB de database e 5GB de bandwidth
- Com 20k usuários, você vai precisar de ~2-5GB de database e ~500GB/mês de bandwidth

### Domínio e SSL
- ✅ Ter domínio próprio (ex: questoesresidencia.com.br)
- ✅ Configurar SSL (Cloudflare oferece grátis)

### Ferramentas Necessárias
- Acesso ao SQL Editor do Supabase
- Git para controle de versão
- Conta no Sentry (monitoramento de erros - grátis até 5k eventos)

---

## 🗄️ Otimizações de Banco de Dados

### Passo 1: Criar Índices Compostos (CRÍTICO)

Execute no Supabase SQL Editor:

```bash
# Arquivo: supabase/14-performance-indexes.sql
```

**Tempo de execução:** 2-5 minutos
**Impacto:** 10-50x mais rápido nas queries

**Como executar:**
1. Acesse Supabase Dashboard → SQL Editor
2. Clique em "New Query"
3. Cole o conteúdo de `supabase/14-performance-indexes.sql`
4. Clique "Run"

**Resultado esperado:**
```sql
CREATE INDEX (várias vezes)
ANALYZE (5 tabelas)
```

### Passo 2: Criar Cache de Ranking (CRÍTICO)

Execute no Supabase SQL Editor:

```bash
# Arquivo: supabase/15-ranking-cache.sql
```

**Tempo de execução:** 1-2 minutos
**Impacto:** 100-600x mais rápido no ranking

**Como executar:**
1. Supabase Dashboard → SQL Editor → New Query
2. Cole o conteúdo de `supabase/15-ranking-cache.sql`
3. Run

**Resultado esperado:**
```sql
CREATE MATERIALIZED VIEW ranking_cache_30_dias
CREATE INDEX (3 índices)
CREATE FUNCTION obter_ranking_ultimos_30_dias()
CREATE FUNCTION refresh_ranking_cache()
```

### Passo 3: Configurar Atualização Automática do Cache

**Opção A: Com pg_cron (Supabase Pro)**

Execute no SQL Editor:

```sql
-- Atualizar ranking a cada 5 minutos
SELECT cron.schedule(
    'refresh-ranking',
    '*/5 * * * *',
    'SELECT refresh_ranking_cache()'
);

-- Verificar cron jobs
SELECT * FROM cron.job;
```

**Opção B: Sem pg_cron (Manual/Edge Function)**

Criar Edge Function que roda a cada 5 minutos:

```javascript
// supabase/functions/refresh-ranking/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { error } = await supabase.rpc('refresh_ranking_cache')

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

Depois configurar cron externo (cron-job.org) para chamar a cada 5 min.

---

## 💻 Otimizações de Frontend

### Passo 1: Adicionar Sistema de Cache

1. **Adicionar script de cache no HTML:**

Adicione em TODOS os arquivos HTML antes de `config.js`:

```html
<script src="js/cache.js"></script>
<script src="js/config.js"></script>
```

2. **Usar dashboard otimizado:**

Substitua `dashboard.js` por `dashboard-optimized.js`:

```html
<!-- Antes -->
<script src="js/dashboard.js"></script>

<!-- Depois -->
<script src="js/dashboard-optimized.js"></script>
```

### Passo 2: Configurar Ambiente de Produção

Edite `js/config.js`:

```javascript
// Quando fizer deploy em produção, mude a detecção:
const IS_DEVELOPMENT = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';

// OU defina manualmente:
const IS_DEVELOPMENT = false; // PRODUÇÃO
```

Isso desabilita todos os logs de debug automaticamente.

### Passo 3: Minificar Assets (Opcional mas Recomendado)

**Instalar ferramentas:**
```bash
npm install -g terser csso-cli
```

**Minificar JS:**
```bash
terser js/config.js js/utils.js js/cache.js -o js/bundle.min.js --compress --mangle
```

**Minificar CSS:**
```bash
csso css/styles.css -o css/styles.min.css
```

**Atualizar HTML para usar versões minificadas:**
```html
<!-- Produção -->
<link rel="stylesheet" href="css/styles.min.css">
<script src="js/bundle.min.js"></script>

<!-- Desenvolvimento -->
<link rel="stylesheet" href="css/styles.css">
<script src="js/config.js"></script>
```

---

## ☁️ Configuração de Infraestrutura

### CDN para Assets Estáticos

**Opção A: Cloudflare (Grátis + Melhor)**

1. Criar conta em cloudflare.com
2. Adicionar seu domínio
3. Atualizar nameservers no registrador do domínio
4. Ativar "Auto Minify" para JS, CSS, HTML
5. Ativar "Brotli Compression"
6. Configurar cache rules:
   - CSS/JS: cache por 1 ano
   - HTML: cache por 1 hora
   - Imagens: cache por 1 mês

**Resultado:**
- Reduz bandwidth em 60-70%
- Site 2-3x mais rápido globalmente
- Custo: R$ 0 (grátis!)

**Opção B: Cloudinary para Imagens**

Para hospedar imagens das questões:

1. Criar conta em cloudinary.com (grátis até 25GB)
2. Upload de imagens via API
3. Usar URLs do Cloudinary ao invés de Supabase Storage

```javascript
// Antes
const imagemUrl = supabaseStorage.getPublicUrl('questao.jpg')

// Depois
const imagemUrl = 'https://res.cloudinary.com/seu-cloud/image/upload/v1234/questao.jpg'
```

**Economia:** 70-80% no bandwidth do Supabase

### Rate Limiting

**Com Cloudflare:**

1. Dashboard → Security → WAF
2. Criar regra:
   - Se (Requests > 100/minuto por IP)
   - Então (Challenge ou Block)

**Sem Cloudflare (Supabase):**

Criar Edge Function com rate limiting:

```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
})

serve(async (req) => {
  const identifier = req.headers.get("x-forwarded-for") ?? "anonymous"
  const { success } = await ratelimit.limit(identifier)

  if (!success) {
    return new Response("Too many requests", { status: 429 })
  }

  // Continuar...
})
```

---

## 📊 Monitoramento

### Sentry para Erros

**1. Criar conta:** sentry.io (grátis até 5k eventos/mês)

**2. Instalar SDK:**

Adicione antes de `</body>`:

```html
<script
  src="https://browser.sentry-cdn.com/7.99.0/bundle.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>

<script>
  Sentry.init({
    dsn: "https://sua-chave@sentry.io/projeto",
    environment: IS_DEVELOPMENT ? 'development' : 'production',
    tracesSampleRate: 0.1, // 10% das transações
  });
</script>
```

**3. Capturar erros customizados:**

```javascript
try {
  // código
} catch (error) {
  Logger.error('Erro crítico:', error);
  Sentry.captureException(error);
}
```

### Supabase Metrics (Nativo)

Dashboard do Supabase já tem métricas:
- Database size
- API requests/minute
- Bandwidth usage
- Active connections

**Alertas importantes:**
- Database > 80% do limite
- Bandwidth > 200 GB/mês
- API requests > 1M/dia

### Analytics (Opcional)

**Plausible Analytics** ($9/mês - respeita privacidade):

```html
<script defer data-domain="seudominio.com"
  src="https://plausible.io/js/script.js"></script>
```

Ou **Google Analytics 4** (grátis mas invasivo).

---

## 💰 Custos Estimados

### Com Otimizações (Recomendado)

| Item | Custo Mensal |
|------|--------------|
| Supabase Pro | $25 |
| Bandwidth Extra (~100GB)* | $9 |
| Cloudflare | $0 (grátis) |
| Sentry | $0 (grátis) |
| Domínio (.com.br) | $3 |
| **Total** | **~$37/mês** |

*Com CDN Cloudflare, reduz de 500GB para ~100GB

### Sem Otimizações (Não Recomendado)

| Item | Custo Mensal |
|------|--------------|
| Supabase Pro | $25 |
| Bandwidth Extra (~500GB) | $45 |
| **Total** | **~$70/mês** |

### Crescimento (50k usuários)

| Item | Custo Mensal |
|------|--------------|
| Supabase Pro | $25 |
| Database Extra (~2GB) | $5 |
| Bandwidth Extra (~300GB) | $27 |
| **Total** | **~$57/mês** |

### Receita Necessária

Com 20k usuários e 5% de conversão para plano pago:
- 1,000 usuários pagos × R$ 60/mês = **R$ 60,000/mês**
- Custo: $40/mês ≈ R$ 200/mês
- **Margem: 99.6%** 💰

---

## 🔧 Troubleshooting

### Ranking Lento Mesmo com Cache

**Diagnóstico:**
```sql
-- Ver quando cache foi atualizado
SELECT MAX(cache_timestamp) FROM ranking_cache_30_dias;

-- Se > 10 minutos atrás, refresh manualmente:
SELECT refresh_ranking_cache();
```

**Solução permanente:**
- Verificar se cron está ativo
- Ver logs do pg_cron: `SELECT * FROM cron.job_run_details;`

### Dashboard Lento

**Diagnóstico:**
```javascript
// No console do navegador:
cache.getStats()
// {total: 5, expired: 1, active: 4, sizeKB: 123}
```

Se `expired` for alto, cache não está funcionando.

**Solução:**
```javascript
// Limpar cache e recarregar
cache.clearAll();
location.reload();
```

### Supabase Atingindo Limites

**Database cheio:**
```sql
-- Ver tamanho das tabelas
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::text)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;
```

**Limpar dados antigos:**
```sql
-- Deletar testes finalizados há > 6 meses
DELETE FROM testes
WHERE status = 'finalizado'
  AND data_finalizacao < NOW() - INTERVAL '6 months';

-- Vacuum para recuperar espaço
VACUUM FULL testes;
```

### Muitos Erros no Sentry

**Filtrar erros conhecidos:**

```javascript
Sentry.init({
  beforeSend(event, hint) {
    // Ignorar erros específicos
    if (event.message?.includes('ResizeObserver')) {
      return null; // Não enviar
    }
    return event;
  }
});
```

---

## ✅ Checklist de Deploy

### Antes do Deploy

- [ ] Executar `14-performance-indexes.sql` no Supabase
- [ ] Executar `15-ranking-cache.sql` no Supabase
- [ ] Configurar pg_cron para refresh do ranking
- [ ] Adicionar `cache.js` em todos os HTMLs
- [ ] Mudar `IS_DEVELOPMENT = false` no config.js
- [ ] Configurar Cloudflare CDN
- [ ] Configurar Sentry
- [ ] Testar em ambiente de staging

### Depois do Deploy

- [ ] Verificar cache funcionando (console: `cache.getStats()`)
- [ ] Verificar ranking carregando rápido (< 500ms)
- [ ] Verificar dashboard carregando rápido (< 1s)
- [ ] Monitorar uso de bandwidth no Supabase
- [ ] Monitorar erros no Sentry
- [ ] Configurar alertas de limite no Supabase

### Manutenção Mensal

- [ ] Verificar custos do Supabase
- [ ] Limpar cache expirado do ranking
- [ ] Revisar logs de erro no Sentry
- [ ] Deletar testes antigos (> 6 meses)
- [ ] VACUUM das tabelas principais

---

## 🎯 Resultados Esperados

Com todas as otimizações:

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Dashboard | 2-5s | 300-800ms | **5-10x** |
| Ranking | 10-30s | 50-200ms | **100-600x** |
| Perfil | 3-8s | 200-500ms | **15-40x** |
| Requests/dia | 10M | 2-3M | **70-80%** ↓ |
| Bandwidth | 500GB | 100-150GB | **70%** ↓ |
| Custo mensal | $70 | $40 | **43%** ↓ |

---

## 📞 Suporte

Se tiver problemas:
1. Verificar logs do console (F12)
2. Verificar Sentry para erros
3. Verificar Supabase Logs
4. Abrir issue no GitHub com:
   - Descrição do problema
   - Logs de erro
   - Steps to reproduce

---

**Última atualização:** 2025-12-28
**Versão:** 2.0 - Otimizado para 20k usuários
