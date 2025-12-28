// ============================================
// ADICIONAR AO DASHBOARD
// Seção de "Quem visitou meu perfil (24h)"
// ============================================

// Nova função para carregar visitantes
async function carregarVisitantes() {
    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        const { data: visitantes, error } = await supabaseClient
            .rpc('obter_visitantes_24h', {
                p_usuario_id: userId
            });

        if (error) throw error;

        const container = document.getElementById('visitantesContainer');
        if (!container) return;

        if (!visitantes || visitantes.length === 0) {
            container.innerHTML = `
                <p style="color: var(--secondary-color); text-align: center; padding: 20px;">
                    Ninguém visitou seu perfil nas últimas 24 horas
                </p>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${visitantes.map(v => {
                    const dataFormatada = new Date(v.data_visualizacao).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--white);">
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">
                                    ${v.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <a href="perfil.html?id=${v.visitante_id}" style="color: var(--primary-color); font-weight: 600; text-decoration: none;">
                                        ${v.nome}
                                    </a>
                                    ${v.instagram ? `<div style="color: var(--secondary-color); font-size: 12px;">@${v.instagram}</div>` : ''}
                                    <div style="color: var(--secondary-color); font-size: 12px; margin-top: 2px;">
                                        ${dataFormatada}
                                    </div>
                                </div>
                            </div>
                            <button
                                class="btn btn-small"
                                onclick="abrirModalReportVisitante('${v.visitante_id}', '${v.nome}')"
                                style="background: var(--error-color); color: white; padding: 6px 12px; font-size: 12px;"
                            >
                                ⚠️ Reportar
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

    } catch (error) {
        Logger.error('Erro ao carregar visitantes:', error);
    }
}

// Abrir modal de report para visitante
function abrirModalReportVisitante(visitanteId, visitanteNome) {
    // Guardar dados temporariamente
    window.tempReportData = {
        id: visitanteId,
        nome: visitanteNome
    };

    const modal = document.getElementById('modalReportDashboard');
    if (modal) {
        modal.classList.add('show');
        document.getElementById('reportNomeUsuario').textContent = visitanteNome;
        document.getElementById('reportMotivoDashboard').value = '';
    }
}

// Fechar modal de report do dashboard
function fecharModalReportDashboard() {
    const modal = document.getElementById('modalReportDashboard');
    if (modal) {
        modal.classList.remove('show');
    }
    window.tempReportData = null;
}

// Enviar report do dashboard
async function enviarReportDashboard() {
    try {
        if (!window.tempReportData) {
            Utils.showNotification('Erro ao processar report', 'error');
            return;
        }

        const session = await Utils.checkAuth();
        const motivo = document.getElementById('reportMotivoDashboard').value.trim();

        const { data, error } = await supabaseClient
            .rpc('reportar_usuario', {
                p_usuario_reportado_id: window.tempReportData.id,
                p_quem_reportou_id: session.user.id,
                p_motivo: motivo || null
            });

        if (error) throw error;

        if (data.success) {
            Utils.showNotification('Usuário reportado com sucesso. Obrigado!', 'success');
            fecharModalReportDashboard();
        } else {
            Utils.showNotification(data.error || 'Erro ao reportar usuário', 'error');
        }

    } catch (error) {
        Logger.error('Erro ao reportar usuário:', error);
        Utils.showNotification('Erro ao reportar usuário', 'error');
    }
}

// ============================================
// HTML PARA ADICIONAR NO DASHBOARD.HTML
// ============================================

const htmlVisitantes = `
<!-- Seção de Visitantes (adicionar após a seção de Provas Selecionadas) -->
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
`;

const modalReportDashboardHTML = `
<!-- Modal de Report do Dashboard -->
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
                Por favor, descreva o motivo do report. Isso nos ajuda a manter a comunidade segura.
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
                <small style="color: var(--secondary-color);">Máximo 500 caracteres</small>
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
`;

// ============================================
// INSTRUÇÕES DE INTEGRAÇÃO
// ============================================

/*
1. No dashboard.html:
   - Adicione htmlVisitantes após a seção de Provas Selecionadas (linha ~90)
   - Adicione modalReportDashboardHTML antes de </body>

2. No dashboard.js (ou dashboard-optimized.js):
   - No DOMContentLoaded, adicione: await carregarVisitantes();
   - Adicione todas as funções deste arquivo

3. Pronto! Os visitantes aparecerão automaticamente

NOTA: A seção atualiza automaticamente quando alguém visita o perfil
*/
