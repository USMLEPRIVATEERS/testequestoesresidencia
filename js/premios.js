// ============================================
// SISTEMA DE PRÊMIOS - CONTRIBUIÇÕES DE PROVAS
// ============================================

let provasSelecionada = null;

// Carregar ao iniciar a página
window.addEventListener('DOMContentLoaded', async () => {
    await Utils.requireAuth();
    await carregarProvasNecessarias();
    await carregarMinhasContribuicoes();
});

// ====== CARREGAR PROVAS NECESSÁRIAS ======
async function carregarProvasNecessarias() {
    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        // Buscar provas que ainda estamos procurando
        const { data: provas, error } = await supabaseClient
            .from('provas_necessarias')
            .select('*')
            .eq('status', 'procurando')
            .order('ano', { ascending: false });

        if (error) throw error;

        // Buscar contribuições já feitas pelo usuário
        const { data: contribuicoes, error: contribError } = await supabaseClient
            .from('contribuicoes_provas')
            .select('prova_necessaria_id')
            .eq('usuario_id', userId);

        if (contribError) throw contribError;

        const provasJaContribuidas = new Set(contribuicoes.map(c => c.prova_necessaria_id));

        renderizarProvas(provas, provasJaContribuidas);
    } catch (error) {
        console.error('Erro ao carregar provas:', error);
        Utils.showNotification('Erro ao carregar provas necessárias.', 'error');
    }
}

// ====== RENDERIZAR PROVAS ======
function renderizarProvas(provas, provasJaContribuidas) {
    const grid = document.getElementById('provasGrid');

    if (!provas || provas.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--gray-600);">
                <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                <h3 style="font-size: 24px; margin-bottom: 12px;">Nenhuma prova pendente no momento!</h3>
                <p>Obrigado por contribuir! Volte mais tarde para ver novas provas.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = provas.map(prova => {
        const jaContribuiu = provasJaContribuidas.has(prova.id);

        return `
            <div class="prova-card ${jaContribuiu ? 'recebida' : ''}">
                <div class="prova-info">
                    <h3>${prova.instituicao}</h3>
                    <div class="prova-detail">
                        <strong>Processo:</strong> ${prova.processo_seletivo}
                    </div>
                    <div class="prova-detail">
                        <strong>Ano:</strong> ${prova.ano}
                    </div>
                    ${prova.especialidade ? `
                        <div class="prova-detail">
                            <strong>Especialidade:</strong> ${prova.especialidade}
                        </div>
                    ` : ''}
                    ${prova.observacoes ? `
                        <div class="prova-obs">
                            📌 ${prova.observacoes}
                        </div>
                    ` : ''}
                </div>
                ${!jaContribuiu ? `
                    <button class="btn btn-primary" onclick="abrirModalContribuicao('${prova.id}', '${prova.instituicao}', '${prova.processo_seletivo}', ${prova.ano})">
                        Contribuir com esta Prova
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ====== ABRIR MODAL DE CONTRIBUIÇÃO ======
function abrirModalContribuicao(provaId, instituicao, processoSeletivo, ano) {
    provasSelecionada = {
        id: provaId,
        instituicao: instituicao,
        processoSeletivo: processoSeletivo,
        ano: ano
    };

    // Preencher informações da prova no modal
    const infoModal = document.getElementById('provaInfoModal');
    infoModal.innerHTML = `
        <h3 style="margin-bottom: 12px; color: var(--black);">${instituicao}</h3>
        <p style="margin-bottom: 6px;"><strong>Processo:</strong> ${processoSeletivo}</p>
        <p><strong>Ano:</strong> ${ano}</p>
    `;

    // Limpar formulário
    document.getElementById('linkDrive').value = '';
    document.getElementById('observacoesContrib').value = '';

    // Mostrar modal
    document.getElementById('modalContribuicao').classList.add('show');
}

// ====== FECHAR MODAL ======
function fecharModalContribuicao() {
    document.getElementById('modalContribuicao').classList.remove('show');
    provasSelecionada = null;
}

// ====== ENVIAR CONTRIBUIÇÃO ======
async function enviarContribuicao(event) {
    event.preventDefault();

    if (!provasSelecionada) {
        Utils.showNotification('Erro: nenhuma prova selecionada.', 'error');
        return;
    }

    const linkDrive = document.getElementById('linkDrive').value.trim();
    const observacoes = document.getElementById('observacoesContrib').value.trim();

    // Validar link do Google Drive
    if (!linkDrive.includes('drive.google.com')) {
        Utils.showNotification('Por favor, insira um link válido do Google Drive.', 'error');
        return;
    }

    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        // Verificar se já contribuiu para esta prova
        const { data: contribExistente, error: checkError } = await supabaseClient
            .from('contribuicoes_provas')
            .select('id')
            .eq('usuario_id', userId)
            .eq('prova_necessaria_id', provasSelecionada.id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found (ok)
            throw checkError;
        }

        if (contribExistente) {
            Utils.showNotification('Você já enviou uma contribuição para esta prova!', 'error');
            return;
        }

        // Inserir contribuição
        const { error: insertError } = await supabaseClient
            .from('contribuicoes_provas')
            .insert([
                {
                    usuario_id: userId,
                    prova_necessaria_id: provasSelecionada.id,
                    link_drive: linkDrive,
                    observacoes: observacoes || null,
                    status: 'pendente',
                    data_contribuicao: new Date().toISOString()
                }
            ]);

        if (insertError) throw insertError;

        Utils.showNotification('Contribuição enviada com sucesso! Nossa equipe irá avaliar em até 48h.', 'success');

        // Fechar modal
        fecharModalContribuicao();

        // Recarregar listas
        await carregarProvasNecessarias();
        await carregarMinhasContribuicoes();

    } catch (error) {
        console.error('Erro ao enviar contribuição:', error);
        Utils.showNotification('Erro ao enviar contribuição: ' + error.message, 'error');
    }
}

// ====== CARREGAR MINHAS CONTRIBUIÇÕES ======
async function carregarMinhasContribuicoes() {
    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        // Buscar contribuições do usuário com informações da prova
        const { data: contribuicoes, error } = await supabaseClient
            .from('contribuicoes_provas')
            .select(`
                *,
                prova_necessaria:provas_necessarias(instituicao, processo_seletivo, ano, especialidade)
            `)
            .eq('usuario_id', userId)
            .order('data_contribuicao', { ascending: false });

        if (error) throw error;

        renderizarMinhasContribuicoes(contribuicoes);
    } catch (error) {
        console.error('Erro ao carregar contribuições:', error);
        Utils.showNotification('Erro ao carregar suas contribuições.', 'error');
    }
}

// ====== RENDERIZAR MINHAS CONTRIBUIÇÕES ======
function renderizarMinhasContribuicoes(contribuicoes) {
    const container = document.getElementById('minhasContribuicoes');

    if (!contribuicoes || contribuicoes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: var(--white); border-radius: var(--radius-lg); border: 2px dashed var(--gray-300);">
                <p style="color: var(--gray-600); font-size: 16px;">Você ainda não fez nenhuma contribuição.</p>
                <p style="color: var(--gray-500); font-size: 14px; margin-top: 8px;">Escolha uma prova acima e comece a ganhar meses grátis!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = contribuicoes.map(contrib => {
        const prova = contrib.prova_necessaria;
        const statusClass = contrib.status; // pendente, aprovada, recusada

        let statusTexto, statusDescricao;
        switch (contrib.status) {
            case 'pendente':
                statusTexto = 'Em Análise';
                statusDescricao = 'Nossa equipe está avaliando sua contribuição.';
                break;
            case 'aprovada':
                statusTexto = 'Aprovada';
                statusDescricao = contrib.premio_concedido
                    ? `🎉 Parabéns! Você ganhou 1 mês grátis em ${new Date(contrib.data_premio).toLocaleDateString('pt-BR')}.`
                    : 'Aprovada! O prêmio será concedido em breve.';
                break;
            case 'recusada':
                statusTexto = 'Recusada';
                statusDescricao = contrib.motivo_recusa || 'Não foi possível utilizar esta contribuição.';
                break;
            default:
                statusTexto = contrib.status;
                statusDescricao = '';
        }

        return `
            <div class="contrib-item ${statusClass}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                    <div>
                        <h3 style="font-size: 18px; margin-bottom: 8px;">${prova.instituicao} - ${prova.ano}</h3>
                        <p style="color: var(--gray-700); margin-bottom: 4px;">${prova.processo_seletivo}</p>
                        ${prova.especialidade ? `<p style="color: var(--gray-600); font-size: 14px;">${prova.especialidade}</p>` : ''}
                    </div>
                    <span class="status-badge ${statusClass}">${statusTexto}</span>
                </div>

                <div style="background: var(--white); padding: 12px; border-radius: var(--radius); margin-bottom: 12px;">
                    <div style="font-size: 13px; color: var(--gray-700); margin-bottom: 6px;">
                        <strong>Enviado em:</strong> ${new Date(contrib.data_contribuicao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    <div style="font-size: 13px; color: var(--gray-700);">
                        <strong>Link do Drive:</strong>
                        <a href="${contrib.link_drive}" target="_blank" style="color: var(--black); text-decoration: underline;">
                            Ver no Google Drive
                        </a>
                    </div>
                    ${contrib.observacoes ? `
                        <div style="font-size: 13px; color: var(--gray-700); margin-top: 6px;">
                            <strong>Observações:</strong> ${contrib.observacoes}
                        </div>
                    ` : ''}
                </div>

                <div style="font-size: 14px; color: var(--gray-700); line-height: 1.6;">
                    ${statusDescricao}
                </div>

                ${contrib.status === 'aprovada' && contrib.premio_concedido && contrib.feedback_validador ? `
                    <div style="background: var(--gray-50); padding: 12px; border-radius: var(--radius); margin-top: 12px; font-size: 14px; color: var(--gray-700);">
                        <strong>Feedback da equipe:</strong> ${contrib.feedback_validador}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ====== FECHAR MODAL AO CLICAR FORA ======
window.addEventListener('click', (event) => {
    const modal = document.getElementById('modalContribuicao');
    if (event.target === modal) {
        fecharModalContribuicao();
    }
});
