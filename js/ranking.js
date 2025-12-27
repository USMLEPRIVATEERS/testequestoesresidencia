// ============================================
// RANKING DE ESTUDANTES
// ============================================

let currentUserId = null;
let currentPage = 1;
const itemsPerPage = 100;
let currentSort = { field: 'total_questoes', order: 'desc' };
let rankingData = [];

// Verificar autenticação ao carregar
window.addEventListener('DOMContentLoaded', async () => {
    const session = await Utils.checkAuth();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    currentUserId = session.user.id;
    await carregarRanking();
});

// Carregar dados do ranking
async function carregarRanking() {
    try {
        document.getElementById('loadingRanking').classList.remove('hide');
        document.getElementById('rankingContent').classList.add('hide');
        document.getElementById('noDataMessage').classList.add('hide');

        // Calcular data de 30 dias atrás
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);

        // Buscar estatísticas dos últimos 30 dias para cada usuário
        const { data: usuarios, error: usuariosError } = await supabaseClient
            .from('usuarios')
            .select('id, nome, instagram');

        if (usuariosError) throw usuariosError;

        // Para cada usuário, buscar suas estatísticas dos últimos 30 dias
        const rankingPromises = usuarios.map(async (usuario) => {
            // Buscar respostas dos últimos 30 dias
            const { data: respostas, error: respostasError } = await supabaseClient
                .from('respostas_usuarios')
                .select('status_resposta')
                .eq('usuario_id', usuario.id)
                .gte('data_resposta', dataLimite.toISOString());

            if (respostasError) {
                console.error('Erro ao buscar respostas:', respostasError);
                return null;
            }

            const totalQuestoes = respostas.length;
            const totalCorretas = respostas.filter(r => r.status_resposta === 'C').length;
            const porcentagemAcertos = totalQuestoes > 0
                ? Math.round((totalCorretas / totalQuestoes) * 100)
                : 0;

            return {
                id: usuario.id,
                nome: usuario.nome,
                instagram: usuario.instagram,
                total_questoes: totalQuestoes,
                total_corretas: totalCorretas,
                porcentagem_acertos: porcentagemAcertos
            };
        });

        const results = await Promise.all(rankingPromises);
        rankingData = results.filter(r => r !== null);

        // Mostrar todos os usuários, mesmo que não tenham respondido questões
        // (removido o filtro r.total_questoes > 0)

        if (rankingData.length === 0) {
            document.getElementById('loadingRanking').classList.add('hide');
            document.getElementById('noDataMessage').classList.remove('hide');
            return;
        }

        // Aplicar ordenação
        aplicarOrdenacao();
        renderizarRanking();

        document.getElementById('loadingRanking').classList.add('hide');
        document.getElementById('rankingContent').classList.remove('hide');

    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        Utils.showNotification('Erro ao carregar ranking: ' + error.message, 'error');
        document.getElementById('loadingRanking').classList.add('hide');
        document.getElementById('noDataMessage').classList.remove('hide');
    }
}

// Aplicar ordenação aos dados
function aplicarOrdenacao() {
    rankingData.sort((a, b) => {
        let valA = a[currentSort.field];
        let valB = b[currentSort.field];

        // Para ordenação por nome, usar lowercase
        if (currentSort.field === 'nome') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        // Tratar Instagram null como vazio
        if (currentSort.field === 'instagram') {
            valA = valA || '';
            valB = valB || '';
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (currentSort.order === 'asc') {
            return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else {
            return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
    });
}

// Renderizar tabela de ranking
function renderizarRanking() {
    const tbody = document.getElementById('rankingTableBody');
    tbody.innerHTML = '';

    // Calcular índices da página atual
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, rankingData.length);
    const paginaAtual = rankingData.slice(startIndex, endIndex);

    paginaAtual.forEach((usuario, index) => {
        const posicao = startIndex + index + 1;
        const isCurrentUser = usuario.id === currentUserId;

        const tr = document.createElement('tr');
        if (isCurrentUser) {
            tr.classList.add('highlight-current-user');
        }

        // Medalhas para top 3
        let medalha = '';
        if (posicao === 1) medalha = '<span class="medal">🥇</span>';
        else if (posicao === 2) medalha = '<span class="medal">🥈</span>';
        else if (posicao === 3) medalha = '<span class="medal">🥉</span>';

        // Badge de porcentagem de acertos
        let badgeClass = 'low';
        if (usuario.porcentagem_acertos >= 80) badgeClass = 'excellent';
        else if (usuario.porcentagem_acertos >= 60) badgeClass = 'good';
        else if (usuario.porcentagem_acertos >= 40) badgeClass = 'average';

        // Coluna de Instagram
        let instagramCell;
        if (usuario.instagram) {
            instagramCell = `<a href="https://instagram.com/${usuario.instagram}" target="_blank" class="instagram-link">@${usuario.instagram}</a>`;
        } else if (isCurrentUser) {
            instagramCell = `<button class="btn btn-small add-instagram-btn" onclick="abrirModalInstagram()">+ Adicionar</button>`;
        } else {
            instagramCell = '<span style="color: var(--secondary-color);">-</span>';
        }

        // Texto de questões respondidas
        const questoesText = usuario.total_questoes > 0
            ? `<strong>${usuario.total_questoes}</strong> questões`
            : '<span style="color: var(--secondary-color);">Nenhuma questão ainda</span>';

        // Stats badge só se tiver questões
        const statsText = usuario.total_questoes > 0
            ? `<span class="stats-badge ${badgeClass}">${usuario.porcentagem_acertos}%</span>
               <span style="color: var(--secondary-color); font-size: 12px;"> (${usuario.total_corretas}/${usuario.total_questoes})</span>`
            : '<span style="color: var(--secondary-color);">-</span>';

        tr.innerHTML = `
            <td class="ranking-position">${medalha}${posicao}º</td>
            <td>
                <a href="perfil.html?id=${usuario.id}" class="user-name">${usuario.nome}</a>
                ${isCurrentUser ? '<span style="color: var(--secondary-color); font-size: 12px;"> (você)</span>' : ''}
            </td>
            <td>${instagramCell}</td>
            <td>${questoesText}</td>
            <td>${statsText}</td>
        `;

        tbody.appendChild(tr);
    });

    // Atualizar informações de paginação
    atualizarPaginacao();
}

// Atualizar controles de paginação
function atualizarPaginacao() {
    const totalPages = Math.ceil(rankingData.length / itemsPerPage);

    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
    document.getElementById('btnPrevPage').disabled = currentPage === 1;
    document.getElementById('btnNextPage').disabled = currentPage === totalPages;
}

// Página anterior
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderizarRanking();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Próxima página
function nextPage() {
    const totalPages = Math.ceil(rankingData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderizarRanking();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Ordenar por coluna
function sortBy(field) {
    // Se clicar na mesma coluna, inverter ordem
    if (currentSort.field === field) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        // Por padrão, ordenar números em ordem decrescente, texto em ascendente
        currentSort.order = (field === 'nome' || field === 'instagram') ? 'asc' : 'desc';
    }

    // Atualizar classes de ordenação
    document.querySelectorAll('.ranking-table th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });

    const thClicked = event.target;
    thClicked.classList.add(currentSort.order === 'asc' ? 'sorted-asc' : 'sorted-desc');

    aplicarOrdenacao();
    currentPage = 1; // Voltar para primeira página
    renderizarRanking();
}

// Mudar ordenação pelo select
function changeSortBy() {
    const value = document.getElementById('sortBySelect').value;

    switch(value) {
        case 'questoes_desc':
            currentSort = { field: 'total_questoes', order: 'desc' };
            break;
        case 'acertos_desc':
            currentSort = { field: 'porcentagem_acertos', order: 'desc' };
            break;
        case 'nome_asc':
            currentSort = { field: 'nome', order: 'asc' };
            break;
    }

    aplicarOrdenacao();
    currentPage = 1;
    renderizarRanking();
}

// Abrir modal de Instagram
function abrirModalInstagram() {
    document.getElementById('modalInstagram').classList.add('show');
    document.getElementById('instagramInput').value = '';
    document.getElementById('instagramInput').focus();
}

// Fechar modal de Instagram
function fecharModalInstagram() {
    document.getElementById('modalInstagram').classList.remove('show');
}

// Salvar Instagram
async function salvarInstagram() {
    const instagram = document.getElementById('instagramInput').value.trim();

    // Validar Instagram
    const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
    if (!instagram) {
        Utils.showNotification('Digite um nome de usuário!', 'error');
        return;
    }

    if (!instagramRegex.test(instagram)) {
        Utils.showNotification('Nome de usuário inválido! Use apenas letras, números, pontos e underscores.', 'error');
        return;
    }

    if (instagram.startsWith('.') || instagram.startsWith('_')) {
        Utils.showNotification('Nome de usuário não pode começar com ponto ou underscore.', 'error');
        return;
    }

    try {
        // Atualizar no banco
        const { error } = await supabaseClient
            .from('usuarios')
            .update({ instagram: instagram })
            .eq('id', currentUserId);

        if (error) throw error;

        Utils.showNotification('Instagram adicionado com sucesso!', 'success');
        fecharModalInstagram();

        // Recarregar ranking
        await carregarRanking();

    } catch (error) {
        console.error('Erro ao salvar Instagram:', error);
        Utils.showNotification('Erro ao salvar Instagram: ' + error.message, 'error');
    }
}

// Fechar modal ao clicar fora
window.addEventListener('click', (event) => {
    const modal = document.getElementById('modalInstagram');
    if (event.target === modal) {
        fecharModalInstagram();
    }
});
