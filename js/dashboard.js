// ============================================
// DASHBOARD
// ============================================

let currentUser = null;
let performanceChart = null;

// Inicializar dashboard ao carregar a página
window.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    await Utils.requireAuth();

    // Carregar dados do usuário
    currentUser = await UserManager.getCurrentUser();

    if (currentUser) {
        document.getElementById('welcomeMessage').textContent = `Bem-vindo, ${currentUser.nome}!`;
        await carregarEstatisticas();
        await carregarProvasSelecionadas();
        await atualizarGrafico();
    }
});

// Carregar estatísticas gerais
async function carregarEstatisticas() {
    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        // Obter provas selecionadas do usuário
        const provasSelecionadas = currentUser.provas_selecionadas || [];

        // Total de questões disponíveis nas provas selecionadas
        let totalQuestoesQuery = supabase
            .from('questoes')
            .select('id', { count: 'exact', head: true });

        if (provasSelecionadas.length > 0) {
            totalQuestoesQuery = totalQuestoesQuery.in('processo_seletivo', provasSelecionadas);
        }

        const { count: totalQuestoes } = await totalQuestoesQuery;

        // Questões respondidas pelo usuário
        const { data: respostas, error: respostasError } = await supabase
            .from('respostas_usuarios')
            .select('status_resposta')
            .eq('usuario_id', userId);

        if (respostasError) throw respostasError;

        const questoesRealizadas = respostas.length;
        const questoesCorretas = respostas.filter(r => r.status_resposta === 'C').length;
        const questoesIncorretas = respostas.filter(r => r.status_resposta === 'I').length;

        const percentualConcluido = Utils.calcPercentage(questoesRealizadas, totalQuestoes);
        const percentualAcertos = Utils.calcPercentage(questoesCorretas, questoesRealizadas);

        // Atualizar interface
        document.getElementById('totalQuestoes').textContent = totalQuestoes || 0;
        document.getElementById('questoesRealizadas').textContent = questoesRealizadas;
        document.getElementById('percentualConcluido').textContent = percentualConcluido + '%';
        document.getElementById('totalCorretas').textContent = questoesCorretas;
        document.getElementById('totalIncorretas').textContent = questoesIncorretas;
        document.getElementById('percentualAcertos').textContent = percentualAcertos + '%';

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        Utils.showNotification('Erro ao carregar estatísticas', 'error');
    }
}

// Carregar provas selecionadas
async function carregarProvasSelecionadas() {
    const container = document.getElementById('provasSelecionadas');
    const provas = currentUser.provas_selecionadas || [];

    if (provas.length === 0) {
        container.innerHTML = '<p>Nenhuma prova selecionada. Clique em "Editar Provas" para selecionar.</p>';
    } else {
        container.innerHTML = `
            <div class="flex gap-10" style="flex-wrap: wrap;">
                ${provas.map(prova => `
                    <span style="padding: 8px 16px; border: 2px solid var(--border-color);">
                        ${prova}
                    </span>
                `).join('')}
            </div>
        `;
    }
}

// Abrir modal de edição de provas
async function editarProvas() {
    const modal = document.getElementById('modalProvas');
    modal.classList.add('active');

    // Carregar lista de provas disponíveis
    try {
        const { data: provas, error } = await supabase
            .from('questoes')
            .select('processo_seletivo')
            .order('processo_seletivo');

        if (error) throw error;

        // Obter provas únicas
        const provasUnicas = [...new Set(provas.map(p => p.processo_seletivo))];
        const provasSelecionadas = currentUser.provas_selecionadas || [];

        const listaProvas = document.getElementById('listaProvas');
        listaProvas.innerHTML = provasUnicas.map(prova => `
            <div class="form-group">
                <label>
                    <input
                        type="checkbox"
                        class="form-checkbox"
                        value="${prova}"
                        ${provasSelecionadas.includes(prova) ? 'checked' : ''}
                    >
                    ${prova}
                </label>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar provas:', error);
        Utils.showNotification('Erro ao carregar provas disponíveis', 'error');
    }
}

// Fechar modal de provas
function fecharModalProvas() {
    const modal = document.getElementById('modalProvas');
    modal.classList.remove('active');
}

// Salvar provas selecionadas
async function salvarProvas() {
    const checkboxes = document.querySelectorAll('#listaProvas input[type="checkbox"]:checked');
    const provasSelecionadas = Array.from(checkboxes).map(cb => cb.value);

    const success = await UserManager.updateProvasSelecionadas(provasSelecionadas);

    if (success) {
        Utils.showNotification('Provas atualizadas com sucesso!', 'success');
        fecharModalProvas();
        await carregarProvasSelecionadas();
        await carregarEstatisticas();
    } else {
        Utils.showNotification('Erro ao atualizar provas', 'error');
    }
}

// Atualizar gráfico de desempenho
async function atualizarGrafico() {
    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        const periodo = document.getElementById('periodoPicker').value;
        const metrica = document.getElementById('metricaPicker').value;

        // Chamar função do Supabase para obter dados
        const { data, error } = await supabase
            .rpc('obter_estatisticas_dashboard', {
                p_usuario_id: userId,
                p_periodo: periodo,
                p_metrica: metrica
            });

        if (error) throw error;

        // Preparar dados para o gráfico
        const labels = data.map(d => {
            const date = new Date(d.data);
            if (periodo === 'diario') {
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            } else if (periodo === 'semanal') {
                return `Sem ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
            } else {
                return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            }
        });

        const valores = data.map(d => d.valor);

        // Configurar gráfico
        const ctx = document.getElementById('performanceChart').getContext('2d');

        // Destruir gráfico anterior se existir
        if (performanceChart) {
            performanceChart.destroy();
        }

        // Criar novo gráfico
        performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: document.getElementById('metricaPicker').selectedOptions[0].text,
                    data: valores,
                    borderColor: '#000000',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (metrica.includes('porcentagem')) {
                                    return value + '%';
                                }
                                return value;
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Erro ao carregar gráfico:', error);
        Utils.showNotification('Erro ao carregar gráfico de desempenho', 'error');
    }
}
