// ============================================
// TESTES ANTERIORES
// ============================================

let todosOsTestes = [];
let filtroAtual = 'todos';
let testeParaRefazer = null;

// Inicializar página
window.addEventListener('DOMContentLoaded', async () => {
    await Utils.requireAuth();
    await carregarTestes();
});

// Carregar todos os testes do usuário
async function carregarTestes() {
    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        const { data: testes, error } = await supabaseClient
            .from('testes')
            .select('*')
            .eq('usuario_id', userId)
            .order('data_inicio', { ascending: false });

        if (error) throw error;

        todosOsTestes = testes;

        // Carregar estatísticas de cada teste
        for (const teste of todosOsTestes) {
            await carregarEstatisticasTeste(teste);
        }

        renderizarTestes();

    } catch (error) {
        console.error('Erro ao carregar testes:', error);
        Utils.showNotification('Erro ao carregar testes', 'error');
    }
}

// Carregar estatísticas de um teste
async function carregarEstatisticasTeste(teste) {
    try {
        const { data: respostas, error } = await supabaseClient
            .from('respostas_usuarios')
            .select('status_resposta')
            .eq('teste_id', teste.id);

        if (error) throw error;

        teste.total_questoes = teste.questoes_ids.length;
        teste.questoes_respondidas = respostas.length;
        teste.corretas = respostas.filter(r => r.status_resposta === 'C').length;
        teste.incorretas = respostas.filter(r => r.status_resposta === 'I').length;
        teste.porcentagem = Utils.calcPercentage(teste.corretas, teste.questoes_respondidas);

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Filtrar testes por status
function filtrarTestes(status) {
    filtroAtual = status;

    // Atualizar botões
    document.querySelectorAll('.card button').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn');
    });

    const btnId = status === 'todos' ? 'btnTodos' :
                  status === 'em_andamento' ? 'btnEmAndamento' :
                  status === 'pausado' ? 'btnPausado' : 'btnFinalizado';

    const btn = document.getElementById(btnId);
    btn.classList.remove('btn');
    btn.classList.add('btn-primary');

    renderizarTestes();
}

// Renderizar lista de testes
function renderizarTestes() {
    const container = document.getElementById('listaTestes');
    const semTestes = document.getElementById('semTestes');

    // Filtrar testes
    let testesFiltrados = todosOsTestes;
    if (filtroAtual !== 'todos') {
        testesFiltrados = todosOsTestes.filter(t => t.status === filtroAtual);
    }

    if (testesFiltrados.length === 0) {
        container.innerHTML = '';
        semTestes.classList.remove('hide');
        return;
    }

    semTestes.classList.add('hide');

    container.innerHTML = testesFiltrados.map(teste => {
        const statusBadge = getStatusBadge(teste.status);
        const modoTexto = teste.modo === 'aprendizado' ? 'Aprendizado' : 'Simulado';

        return `
            <div class="card">
                <div class="card-body">
                    <div class="flex-between mb-20">
                        <div>
                            <h3>${modoTexto} - ${teste.total_questoes} questões</h3>
                            <p style="color: var(--secondary-color); margin-top: 5px;">
                                Iniciado em ${Utils.formatDateTime(teste.data_inicio)}
                            </p>
                        </div>
                        <div>
                            ${statusBadge}
                        </div>
                    </div>

                    ${teste.status === 'finalizado' ? `
                        <div class="row mb-20">
                            <div class="col-4">
                                <div class="stat-box">
                                    <div class="stat-value" style="color: var(--success-color)">
                                        ${teste.corretas}
                                    </div>
                                    <div class="stat-label">Corretas</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="stat-box">
                                    <div class="stat-value" style="color: var(--error-color)">
                                        ${teste.incorretas}
                                    </div>
                                    <div class="stat-label">Incorretas</div>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="stat-box">
                                    <div class="stat-value">${teste.porcentagem}%</div>
                                    <div class="stat-label">Acertos</div>
                                </div>
                            </div>
                        </div>
                        <div class="row mb-20">
                            <div class="col-2">
                                <div class="stat-box">
                                    <div class="stat-value" style="font-size: 20px;">
                                        ${Utils.formatTimeDetailed(teste.tempo_total_segundos || 0)}
                                    </div>
                                    <div class="stat-label">Tempo Total</div>
                                </div>
                            </div>
                            <div class="col-2">
                                <div class="stat-box">
                                    <div class="stat-value" style="font-size: 20px;">
                                        ${Utils.formatTime(Math.floor((teste.tempo_total_segundos || 0) / teste.total_questoes))}
                                    </div>
                                    <div class="stat-label">Tempo/Questão</div>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="mb-20">
                            <strong>Progresso:</strong> ${teste.questoes_respondidas} de ${teste.total_questoes} questões respondidas
                        </div>
                    `}

                    ${teste.filtros && Object.values(teste.filtros).some(v => v) ? `
                        <div class="mb-20" style="font-size: 14px;">
                            <strong>Filtros aplicados:</strong>
                            ${getFiltrosTexto(teste.filtros)}
                        </div>
                    ` : ''}

                    <div class="flex gap-10">
                        ${teste.status === 'finalizado' ? `
                            <button class="btn btn-primary" onclick="revisarTeste('${teste.id}')">
                                Revisar Respostas
                            </button>
                            <button class="btn" onclick="abrirModalRefazer('${teste.id}')">
                                Refazer Teste
                            </button>
                        ` : `
                            <button class="btn btn-primary" onclick="continuarTeste('${teste.id}')">
                                ${teste.status === 'pausado' ? 'Continuar' : 'Retomar'}
                            </button>
                        `}
                        <button class="btn btn-danger" onclick="excluirTeste('${teste.id}')">
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Obter badge de status
function getStatusBadge(status) {
    const badges = {
        'em_andamento': '<span style="padding: 5px 10px; background-color: var(--info-color); color: white; font-size: 12px;">Em Andamento</span>',
        'pausado': '<span style="padding: 5px 10px; background-color: var(--warning-color); color: white; font-size: 12px;">Pausado</span>',
        'finalizado': '<span style="padding: 5px 10px; background-color: var(--success-color); color: white; font-size: 12px;">Finalizado</span>'
    };
    return badges[status] || '';
}

// Obter texto dos filtros
function getFiltrosTexto(filtros) {
    const filtrosAtivos = Object.entries(filtros)
        .filter(([key, value]) => value)
        .map(([key, value]) => {
            const labels = {
                'instituicao': 'Instituição',
                'processo_seletivo': 'Processo',
                'ano': 'Ano',
                'tipo_questao': 'Tipo',
                'dificuldade': 'Dificuldade',
                'assunto': 'Assunto',
                'sistema': 'Sistema',
                'categoria': 'Categoria',
                'topico': 'Tópico',
                'subtopico': 'Subtópico'
            };
            return `${labels[key]}: ${value}`;
        });

    return filtrosAtivos.join(', ') || 'Nenhum';
}

// Continuar teste pausado
function continuarTeste(testeId) {
    window.location.href = `teste.html?id=${testeId}`;
}

// Revisar teste finalizado
function revisarTeste(testeId) {
    window.location.href = `teste.html?id=${testeId}`;
}

// Abrir modal para refazer teste
function abrirModalRefazer(testeId) {
    testeParaRefazer = testeId;
    document.getElementById('modalConfirmacao').classList.add('active');
}

// Fechar modal
function fecharModal() {
    document.getElementById('modalConfirmacao').classList.remove('active');
    testeParaRefazer = null;
}

// Confirmar refazer teste
async function confirmarRefazer() {
    if (!testeParaRefazer) return;

    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        // Buscar teste original
        const testeOriginal = todosOsTestes.find(t => t.id === testeParaRefazer);
        if (!testeOriginal) throw new Error('Teste não encontrado');

        // Buscar questões do teste original
        const { data: questoes, error: questoesError } = await supabaseClient
            .from('questoes')
            .select('*')
            .in('id', testeOriginal.questoes_ids);

        if (questoesError) throw questoesError;

        // Ordenar questões na mesma ordem
        const questoesOrdenadas = testeOriginal.questoes_ids.map(id =>
            questoes.find(q => q.id === id)
        );

        // Criar novo teste
        const { data: novoTeste, error: novoTesteError } = await supabaseClient
            .from('testes')
            .insert([
                {
                    usuario_id: userId,
                    modo: testeOriginal.modo,
                    questoes_ids: testeOriginal.questoes_ids,
                    filtros: testeOriginal.filtros,
                    status: 'em_andamento'
                }
            ])
            .select()
            .single();

        if (novoTesteError) throw novoTesteError;

        // Salvar no localStorage
        Utils.saveToStorage('testeAtual', {
            testeId: novoTeste.id,
            modo: novoTeste.modo,
            questoes: questoesOrdenadas,
            questaoAtual: 0
        });

        Utils.showNotification('Teste criado! Redirecionando...', 'success');

        setTimeout(() => {
            window.location.href = `teste.html?id=${novoTeste.id}`;
        }, 500);

    } catch (error) {
        console.error('Erro ao refazer teste:', error);
        Utils.showNotification('Erro ao criar novo teste', 'error');
    }

    fecharModal();
}

// Excluir teste
async function excluirTeste(testeId) {
    const confirmacao = await Utils.confirm('Deseja realmente excluir este teste? Esta ação não pode ser desfeita.');
    if (!confirmacao) return;

    try {
        // Excluir teste (as respostas serão deletadas em cascata)
        const { error } = await supabaseClient
            .from('testes')
            .delete()
            .eq('id', testeId);

        if (error) throw error;

        Utils.showNotification('Teste excluído com sucesso', 'success');

        // Remover da lista
        todosOsTestes = todosOsTestes.filter(t => t.id !== testeId);
        renderizarTestes();

    } catch (error) {
        console.error('Erro ao excluir teste:', error);
        Utils.showNotification('Erro ao excluir teste', 'error');
    }
}
