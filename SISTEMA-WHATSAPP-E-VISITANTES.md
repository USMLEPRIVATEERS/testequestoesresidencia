# 📱 Sistema de WhatsApp Visível e Visitantes - Guia Completo

## 🎯 Funcionalidades Implementadas

### 1. WhatsApp Visível (Opt-in)
- ✅ Checkbox no ranking para marcar "deixar WhatsApp visível"
- ✅ Por padrão, WhatsApp é PRIVADO
- ✅ Só mostra WhatsApp se AMBOS usuários marcaram como visível
- ✅ Aparece no perfil quando permitido

### 2. Registro de Visitantes
- ✅ Registra automaticamente quem visitou o perfil
- ✅ Mostra visitantes das últimas 24 horas no dashboard
- ✅ Nome clicável (link para perfil)
- ✅ Limpeza automática de visualizações antigas

### 3. Sistema de Reports
- ✅ Botão "Reportar Usuário" em perfis
- ✅ Botão "Reportar" ao lado de cada visitante
- ✅ Modal com campo de motivo (opcional)
- ✅ Previne reportar a si mesmo
- ✅ Previne múltiplos reports do mesmo usuário

---

## 📋 Passo-a-Passo de Instalação

### PASSO 1: Executar SQL no Supabase

1. Acesse: Supabase Dashboard → SQL Editor
2. Clique "New Query"
3. Abra o arquivo: `supabase/16-whatsapp-visivel-e-visualizacoes.sql`
4. Copie TODO o conteúdo
5. Cole no editor e clique "Run"

**O que isso cria:**
- ✅ Campo `whatsapp_visivel` em `usuarios`
- ✅ Tabela `visualizacoes_perfil`
- ✅ Tabela `usuarios_reportados`
- ✅ 5 funções SQL otimizadas
- ✅ RLS policies
- ✅ Índices de performance

**Tempo:** 1-2 minutos

---

### PASSO 2: Atualizar Ranking

O ranking já está pronto! ✅

**Arquivos modificados:**
- `ranking.html` - Checkbox adicionado
- `js/ranking.js` - Funções de toggle adicionadas

**Como testar:**
1. Acesse a página de Ranking
2. Veja o checkbox "📱 Deixar meu WhatsApp visível"
3. Marque/desmarque para testar
4. Atualize a página - estado deve persistir

---

### PASSO 3: Atualizar Perfil

#### 3.1. Adicionar Modal de Report

Abra `perfil.html` e adicione ANTES de `</body>`:

```html
<!-- Modal de Report -->
<div id="modalReport" class="modal">
    <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
            <h2>Reportar Usuário</h2>
            <button class="modal-close" onclick="fecharModalReport()">&times;</button>
        </div>
        <div class="modal-body">
            <p style="color: var(--secondary-color); margin-bottom: 20px;">
                Por favor, descreva o motivo do report. Isso nos ajuda a manter a comunidade segura.
            </p>
            <div class="form-group">
                <label class="form-label">Motivo (opcional)</label>
                <textarea
                    id="reportMotivo"
                    class="form-input"
                    rows="4"
                    placeholder="Ex: Conteúdo inapropriado, spam, etc."
                    maxlength="500"
                ></textarea>
                <small style="color: var(--secondary-color);">Máximo 500 caracteres</small>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn" onclick="fecharModalReport()">Cancelar</button>
            <button class="btn btn-primary" onclick="enviarReport()" style="background: var(--error-color);">
                Enviar Report
            </button>
        </div>
    </div>
</div>
```

#### 3.2. Atualizar perfil.js

Abra `js/perfil.js` e faça estas mudanças:

**A) No início do arquivo, adicione:**
```javascript
let currentViewerId = null;
```

**B) Na função `window.addEventListener('DOMContentLoaded', ...)`, SUBSTITUA por:**
```javascript
window.addEventListener('DOMContentLoaded', async () => {
    const session = await Utils.checkAuth();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    currentViewerId = session.user.id;

    // Pegar ID do usuário da URL
    const urlParams = new URLSearchParams(window.location.search);
    userId = urlParams.get('id');

    if (!userId) {
        mostrarErro();
        return;
    }

    // Registrar visualização (se não for próprio perfil)
    if (userId !== currentViewerId) {
        await registrarVisualizacao();
    }

    await carregarPerfil();
});
```

**C) Adicione estas funções no final do arquivo:**

```javascript
// Registrar visualização
async function registrarVisualizacao() {
    try {
        const { error } = await supabaseClient
            .rpc('registrar_visualizacao_perfil', {
                p_usuario_id: userId,
                p_visitante_id: currentViewerId
            });

        if (error) Logger.error('Erro ao registrar visualização:', error);
    } catch (error) {
        Logger.error('Erro ao registrar visualização:', error);
    }
}

// Abrir modal de report
function abrirModalReport() {
    const modal = document.getElementById('modalReport');
    if (modal) modal.classList.add('show');
}

// Fechar modal de report
function fecharModalReport() {
    const modal = document.getElementById('modalReport');
    if (modal) modal.classList.remove('show');
}

// Enviar report
async function enviarReport() {
    try {
        const motivo = document.getElementById('reportMotivo').value.trim();

        const { data, error } = await supabaseClient
            .rpc('reportar_usuario', {
                p_usuario_reportado_id: userId,
                p_quem_reportou_id: currentViewerId,
                p_motivo: motivo || null
            });

        if (error) throw error;

        if (data.success) {
            Utils.showNotification('Usuário reportado com sucesso!', 'success');
            fecharModalReport();
        } else {
            Utils.showNotification(data.error, 'error');
        }
    } catch (error) {
        Logger.error('Erro ao reportar:', error);
        Utils.showNotification('Erro ao reportar usuário', 'error');
    }
}
```

**D) Na função `renderizarHeader()`, ADICIONE no final:**

```javascript
// Adicionar botão de report (se não for próprio perfil)
if (userId !== currentViewerId) {
    const profileHeader = document.querySelector('.profile-header') ||
                          document.querySelector('.card');
    if (profileHeader) {
        const reportBtn = document.createElement('button');
        reportBtn.className = 'btn btn-small';
        reportBtn.style.cssText = 'background: var(--error-color); color: white; margin-top: 10px;';
        reportBtn.textContent = '⚠️ Reportar Usuário';
        reportBtn.onclick = abrirModalReport;
        profileHeader.appendChild(reportBtn);
    }
}
```

**E) Modificar query de perfil:**

Na função `carregarPerfil()`, linha ~37, ALTERE de:
```javascript
.select('nome, email, whatsapp, instagram')
```

Para:
```javascript
.select('nome, email, whatsapp, whatsapp_visivel, instagram')
```

**F) WhatsApp condicional:**

Na função `renderizarHeader()`, SUBSTITUA a parte do WhatsApp:

```javascript
// Antes (ANTIGO):
if (userData.whatsapp) {
    const whatsappLink = document.createElement('a');
    whatsappLink.href = `https://wa.me/${userData.whatsapp.replace('+', '')}`;
    whatsappLink.target = '_blank';
    whatsappLink.className = 'social-link';
    whatsappLink.innerHTML = '💬 WhatsApp';
    socialLinks.appendChild(whatsappLink);
}

// Depois (NOVO):
if (userData.whatsapp && userData.whatsapp_visivel) {
    // Verificar se visualizador também tem WhatsApp visível
    verificarEMostrarWhatsApp(userData.whatsapp);
}

// E adicione esta função:
async function verificarEMostrarWhatsApp(whatsappTarget) {
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('whatsapp_visivel')
            .eq('id', currentViewerId)
            .single();

        if (error) throw error;

        // Só mostra se AMBOS marcaram como visível
        if (data.whatsapp_visivel === true) {
            const socialLinks = document.getElementById('socialLinks');
            const whatsappLink = document.createElement('a');
            whatsappLink.href = `https://wa.me/${whatsappTarget.replace('+', '')}`;
            whatsappLink.target = '_blank';
            whatsappLink.className = 'social-link';
            whatsappLink.innerHTML = '💬 WhatsApp';
            socialLinks.appendChild(whatsappLink);
        }
    } catch (error) {
        Logger.error('Erro ao verificar WhatsApp:', error);
    }
}
```

---

### PASSO 4: Atualizar Dashboard

#### 4.1. Adicionar Seção de Visitantes

Abra `dashboard.html` e adicione APÓS a seção de Provas Selecionadas (linha ~90):

```html
<!-- Visitantes do Perfil -->
<div class="card mt-30">
    <div class="card-title">👁️ Quem Visitou Meu Perfil (24h)</div>
    <div class="card-body">
        <div id="visitantesContainer">
            <div class="loader">
                <div class="spinner"></div>
            </div>
        </div>
    </div>
</div>
```

#### 4.2. Adicionar Modal de Report

Ainda em `dashboard.html`, adicione ANTES de `</body>`:

```html
<!-- Modal de Report -->
<div id="modalReportDashboard" class="modal">
    <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
            <h2>Reportar Usuário</h2>
            <button class="modal-close" onclick="fecharModalReportDashboard()">&times;</button>
        </div>
        <div class="modal-body">
            <p style="margin-bottom: 15px;">
                Você está reportando: <strong id="reportNomeUsuario"></strong>
            </p>
            <p style="color: var(--secondary-color); margin-bottom: 20px; font-size: 14px;">
                Por favor, descreva o motivo do report.
            </p>
            <div class="form-group">
                <label class="form-label">Motivo (opcional)</label>
                <textarea
                    id="reportMotivoDashboard"
                    class="form-input"
                    rows="4"
                    placeholder="Ex: Comportamento inadequado, spam, etc."
                    maxlength="500"
                ></textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn" onclick="fecharModalReportDashboard()">Cancelar</button>
            <button class="btn btn-primary" onclick="enviarReportDashboard()" style="background: var(--error-color);">
                Enviar Report
            </button>
        </div>
    </div>
</div>
```

#### 4.3. Atualizar dashboard.js

Abra `js/dashboard.js` e:

**A) No DOMContentLoaded, ADICIONE:**
```javascript
await carregarVisitantes();
```

**B) Adicione estas funções no final:**

Ver arquivo `ADICIONAR-AO-DASHBOARD.js` para código completo.

---

## ✅ Como Testar

### Teste 1: WhatsApp Visível
1. Abra o Ranking
2. Marque "Deixar WhatsApp visível"
3. Abra uma aba anônima e faça login com outra conta
4. Nessa segunda conta, também marque "Deixar WhatsApp visível"
5. Clique no perfil da primeira conta
6. **Resultado esperado:** WhatsApp deve aparecer nos links sociais ✅

### Teste 2: WhatsApp Privado
1. Desmarque o checkbox em uma das contas
2. Acesse o perfil da outra
3. **Resultado esperado:** WhatsApp NÃO deve aparecer ❌

### Teste 3: Visitantes
1. Conta A: Acesse perfil de Conta B
2. Conta B: Abra o dashboard
3. **Resultado esperado:** Conta A deve aparecer em "Quem visitou meu perfil" ✅

### Teste 4: Report
1. Acesse perfil de outro usuário
2. Clique "Reportar Usuário"
3. Preencha motivo (opcional)
4. Clique "Enviar Report"
5. **Resultado esperado:** "Usuário reportado com sucesso" ✅

---

## 📊 Ver Usuários Reportados (Admin)

Execute no Supabase SQL Editor:

```sql
-- Ver usuários mais reportados
SELECT * FROM usuarios_mais_reportados
ORDER BY total_reports DESC;

-- Ver todos os reports
SELECT
    u_reportado.nome AS reportado,
    u_reportado.email AS reportado_email,
    u_quem.nome AS quem_reportou,
    r.motivo,
    r.data_report
FROM usuarios_reportados r
INNER JOIN usuarios u_reportado ON r.usuario_reportado_id = u_reportado.id
INNER JOIN usuarios u_quem ON r.quem_reportou_id = u_quem.id
ORDER BY r.data_report DESC
LIMIT 50;

-- Atualizar cache de reportados
REFRESH MATERIALIZED VIEW usuarios_mais_reportados;
```

---

## 🔒 Segurança

✅ **RLS ativo** em todas as tabelas
✅ **Não pode reportar a si mesmo**
✅ **Não pode visualizar próprio perfil** (não conta)
✅ **Apenas visualizador vê seus visitantes**
✅ **WhatsApp só visível com consentimento MÚTUO**

---

## 🚀 Performance

- Visualizações antigas (>24h) são limpadas automaticamente
- Índices otimizados para queries rápidas
- RPC functions para segurança e performance

---

## 📝 Resumo dos Arquivos

### SQL
- ✅ `supabase/16-whatsapp-visivel-e-visualizacoes.sql` - EXECUTAR

### HTML/JS Modificados
- ✅ `ranking.html` - Já modificado
- ✅ `js/ranking.js` - Já modificado
- ⚠️ `perfil.html` - VOCÊ precisa adicionar modal
- ⚠️ `js/perfil.js` - VOCÊ precisa adicionar funções
- ⚠️ `dashboard.html` - VOCÊ precisa adicionar seção + modal
- ⚠️ `js/dashboard.js` - VOCÊ precisa adicionar funções

### Guias de Referência
- 📄 `ADICIONAR-AO-PERFIL.js` - Código para copiar
- 📄 `ADICIONAR-AO-DASHBOARD.js` - Código para copiar
- 📄 `SISTEMA-WHATSAPP-E-VISITANTES.md` - Este guia

---

**Qualquer dúvida, consulte os arquivos de exemplo!** 🚀
