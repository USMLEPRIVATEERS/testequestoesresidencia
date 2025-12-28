// ============================================
// ADICIONAR AO PERFIL.JS
// Funcionalidades de WhatsApp visível, visualizações e reports
// ============================================

// Adicione estas variáveis globais no início do arquivo (após as existentes):
let currentViewerId = null; // ID de quem está vendo o perfil
let targetUser = null; // Usuário sendo visualizado

// Modificar a função DOMContentLoaded para incluir:
async function carregarPerfilComVisualizacao() {
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
}

// Nova função para registrar visualização
async function registrarVisualizacao() {
    try {
        const { error } = await supabaseClient
            .rpc('registrar_visualizacao_perfil', {
                p_usuario_id: userId,
                p_visitante_id: currentViewerId
            });

        if (error) {
            Logger.error('Erro ao registrar visualização:', error);
        } else {
            Logger.debug('✅ Visualização registrada');
        }
    } catch (error) {
        Logger.error('Erro ao registrar visualização:', error);
    }
}

// Modificar renderizarHeader() para incluir WhatsApp visível e botão de report:
function renderizarHeaderComWhatsApp() {
    // Avatar com inicial do nome
    const inicial = userData.nome.charAt(0).toUpperCase();
    document.getElementById('profileAvatar').textContent = inicial;

    // Nome
    document.getElementById('profileName').textContent = userData.nome;

    // Links sociais
    const socialLinks = document.getElementById('socialLinks');
    socialLinks.innerHTML = '';

    if (userData.instagram) {
        const instagramLink = document.createElement('a');
        instagramLink.href = `https://instagram.com/${userData.instagram}`;
        instagramLink.target = '_blank';
        instagramLink.className = 'social-link';
        instagramLink.innerHTML = '📷 @' + userData.instagram;
        socialLinks.appendChild(instagramLink);
    }

    // NOVO: Mostrar WhatsApp APENAS se ambos marcaram como visível
    if (userData.whatsapp && userData.whatsapp_visivel) {
        // Verificar se o visualizador também tem WhatsApp visível
        verificarEMostrarWhatsApp(userData.whatsapp);
    }

    // NOVO: Adicionar botão de report (se não for próprio perfil)
    if (userId !== currentViewerId) {
        adicionarBotaoReport();
    }
}

// Verificar se visualizador também tem WhatsApp visível
async function verificarEMostrarWhatsApp(whatsappTarget) {
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('whatsapp_visivel')
            .eq('id', currentViewerId)
            .single();

        if (error) throw error;

        // Só mostra WhatsApp se AMBOS tiverem marcado como visível
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
        Logger.error('Erro ao verificar WhatsApp visível:', error);
    }
}

// Adicionar botão de report
function adicionarBotaoReport() {
    const profileHeader = document.querySelector('.profile-header') || document.querySelector('.card');
    if (!profileHeader) return;

    const reportBtn = document.createElement('button');
    reportBtn.className = 'btn btn-small';
    reportBtn.style.cssText = 'background: var(--error-color); color: white; margin-top: 10px;';
    reportBtn.textContent = '⚠️ Reportar Usuário';
    reportBtn.onclick = abrirModalReport;

    profileHeader.appendChild(reportBtn);
}

// Abrir modal de report
function abrirModalReport() {
    const modal = document.getElementById('modalReport');
    if (modal) {
        modal.classList.add('show');
        document.getElementById('reportMotivo').value = '';
    }
}

// Fechar modal de report
function fecharModalReport() {
    const modal = document.getElementById('modalReport');
    if (modal) {
        modal.classList.remove('show');
    }
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
            Utils.showNotification('Usuário reportado com sucesso. Obrigado por manter a comunidade segura!', 'success');
            fecharModalReport();
        } else {
            Utils.showNotification(data.error || 'Erro ao reportar usuário', 'error');
        }

    } catch (error) {
        Logger.error('Erro ao reportar usuário:', error);
        Utils.showNotification('Erro ao reportar usuário', 'error');
    }
}

// ============================================
// HTML DO MODAL DE REPORT
// Adicione este HTML no final do perfil.html (antes de </body>)
// ============================================

const modalReportHTML = `
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
`;

// ============================================
// INSTRUÇÕES DE INTEGRAÇÃO
// ============================================

/*
1. No perfil.html, adicione o modal de report antes de </body>:
   - Cole o conteúdo de modalReportHTML

2. No perfil.js, substitua:
   - window.addEventListener('DOMContentLoaded', ...)
     por carregarPerfilComVisualizacao()

3. No perfil.js, substitua renderizarHeader()
   por renderizarHeaderComWhatsApp()

4. Adicione todas as funções acima no perfil.js

5. Na busca inicial do usuário (carregarPerfil), inclua whatsapp_visivel:
   .select('nome, email, whatsapp, whatsapp_visivel, instagram')
*/
