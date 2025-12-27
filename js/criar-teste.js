// ============================================
// CRIAR TESTE
// ============================================
//
// FILTROS EM CASCATA:
// Quando você seleciona um filtro, os outros filtros são atualizados
// automaticamente para mostrar apenas as opções disponíveis nas
// questões que já foram filtradas. Isso evita que o usuário selecione
// combinações que não retornariam nenhuma questão.
//
// Exemplo: Se você seleciona "Múltipla Escolha" no tipo de questão,
// os filtros de Instituição, Ano, Assunto, etc. mostrarão apenas
// as opções que têm questões de múltipla escolha disponíveis.

let filtrosAtuais = {};
let totalQuestoesDisponiveis = 0;

// Inicializar página
window.addEventListener('DOMContentLoaded', async () => {
    await Utils.requireAuth();
    await carregarOpcoesDosFiltros();
    await atualizarFiltros();
});

// Carregar opções dos filtros a partir do banco
async function carregarOpcoesDosFiltros() {
    try {
        // Buscar todas as questões para extrair valores únicos
        const { data: questoes, error } = await supabaseClient
            .from('questoes')
            .select('instituicao, processo_seletivo, ano, assunto, sistema, categoria, topico, subtopico');

        if (error) throw error;

        // Extrair valores únicos para cada campo
        const instituicoes = [...new Set(questoes.map(q => q.instituicao).filter(Boolean))].sort();
        const processos = [...new Set(questoes.map(q => q.processo_seletivo).filter(Boolean))].sort();
        const anos = [...new Set(questoes.map(q => q.ano).filter(Boolean))].sort((a, b) => b - a);
        const assuntos = [...new Set(questoes.map(q => q.assunto).filter(Boolean))].sort();
        const sistemas = [...new Set(questoes.map(q => q.sistema).filter(Boolean))].sort();
        const categorias = [...new Set(questoes.map(q => q.categoria).filter(Boolean))].sort();
        const topicos = [...new Set(questoes.map(q => q.topico).filter(Boolean))].sort();
        const subtopicos = [...new Set(questoes.map(q => q.subtopico).filter(Boolean))].sort();

        // Preencher selects
        preencherSelect('filtroInstituicao', instituicoes);
        preencherSelect('filtroProcesso', processos);
        preencherSelect('filtroAno', anos);
        preencherSelect('filtroAssunto', assuntos);
        preencherSelect('filtroSistema', sistemas);
        preencherSelect('filtroCategoria', categorias);
        preencherSelect('filtroTopico', topicos);
        preencherSelect('filtroSubtopico', subtopicos);

    } catch (error) {
        console.error('Erro ao carregar filtros:', error);
        Utils.showNotification('Erro ao carregar opções de filtros', 'error');
    }
}

// Função auxiliar para preencher um select
function preencherSelect(selectId, opcoes) {
    const select = document.getElementById(selectId);
    const optionAtual = select.value;

    // Manter a opção "Todos/Todas"
    const primeiraOpcao = select.options[0];

    select.innerHTML = '';
    select.appendChild(primeiraOpcao);

    opcoes.forEach(opcao => {
        const option = document.createElement('option');
        option.value = opcao;
        option.textContent = opcao;
        select.appendChild(option);
    });

    // Restaurar seleção se ainda existir
    if (optionAtual && opcoes.includes(optionAtual)) {
        select.value = optionAtual;
    }
}

// Atualizar filtros e contar questões disponíveis
async function atualizarFiltros() {
    // Coletar valores dos filtros
    filtrosAtuais = {
        instituicao: document.getElementById('filtroInstituicao').value || null,
        processo_seletivo: document.getElementById('filtroProcesso').value || null,
        ano: document.getElementById('filtroAno').value || null,
        tipo_questao: document.getElementById('filtroTipo').value || null,
        dificuldade: document.getElementById('filtroDificuldade').value || null,
        assunto: document.getElementById('filtroAssunto').value || null,
        sistema: document.getElementById('filtroSistema').value || null,
        categoria: document.getElementById('filtroCategoria').value || null,
        topico: document.getElementById('filtroTopico').value || null,
        subtopico: document.getElementById('filtroSubtopico').value || null,
    };

    // Atualizar opções dos outros filtros baseado nos filtros selecionados
    await atualizarOpcoesFiltros();

    // Contar questões disponíveis
    await contarQuestoesDisponiveis();
}

// Atualizar opções dos filtros dinamicamente (filtros em cascata)
async function atualizarOpcoesFiltros() {
    try {
        // Buscar questões que atendem aos filtros atuais
        let query = supabaseClient
            .from('questoes')
            .select('instituicao, processo_seletivo, ano, tipo_questao, assunto, sistema, categoria, topico, subtopico');

        // Aplicar filtros selecionados
        Object.entries(filtrosAtuais).forEach(([campo, valor]) => {
            if (valor) {
                // Tratamento especial para dificuldade (não é um campo direto)
                if (campo === 'dificuldade') {
                    // A dificuldade é calculada a partir de total_marcacoes e total_acertos
                    // Vamos pular esse filtro aqui e aplicar depois
                    return;
                }
                query = query.eq(campo, valor);
            }
        });

        const { data: questoesFiltradas, error } = await query;

        if (error) throw error;

        // Se não houver questões filtradas, manter opções vazias ou mostrar todas
        if (!questoesFiltradas || questoesFiltradas.length === 0) {
            // Recarregar opções originais
            await carregarOpcoesDosFiltros();
            return;
        }

        // Extrair valores únicos das questões filtradas
        const instituicoes = [...new Set(questoesFiltradas.map(q => q.instituicao).filter(Boolean))].sort();
        const processos = [...new Set(questoesFiltradas.map(q => q.processo_seletivo).filter(Boolean))].sort();
        const anos = [...new Set(questoesFiltradas.map(q => q.ano).filter(Boolean))].sort((a, b) => b - a);
        const tipos = [...new Set(questoesFiltradas.map(q => q.tipo_questao).filter(Boolean))].sort();
        const assuntos = [...new Set(questoesFiltradas.map(q => q.assunto).filter(Boolean))].sort();
        const sistemas = [...new Set(questoesFiltradas.map(q => q.sistema).filter(Boolean))].sort();
        const categorias = [...new Set(questoesFiltradas.map(q => q.categoria).filter(Boolean))].sort();
        const topicos = [...new Set(questoesFiltradas.map(q => q.topico).filter(Boolean))].sort();
        const subtopicos = [...new Set(questoesFiltradas.map(q => q.subtopico).filter(Boolean))].sort();

        // Atualizar selects (mantendo valores atuais quando possível)
        preencherSelect('filtroInstituicao', instituicoes);
        preencherSelect('filtroProcesso', processos);
        preencherSelect('filtroAno', anos);
        preencherSelectTipo('filtroTipo', tipos);
        preencherSelect('filtroAssunto', assuntos);
        preencherSelect('filtroSistema', sistemas);
        preencherSelect('filtroCategoria', categorias);
        preencherSelect('filtroTopico', topicos);
        preencherSelect('filtroSubtopico', subtopicos);

    } catch (error) {
        console.error('Erro ao atualizar opções dos filtros:', error);
    }
}

// Preencher select de tipo (tem opções hardcoded)
function preencherSelectTipo(selectId, tiposDisponiveis) {
    const select = document.getElementById(selectId);
    const valorAtual = select.value;

    // Opções fixas de tipo
    const tiposFixos = [
        { value: '', text: 'Todos' },
        { value: 'multipla_escolha', text: 'Múltipla Escolha' },
        { value: 'verdadeiro_falso', text: 'Verdadeiro/Falso' },
        { value: 'dissertativa', text: 'Dissertativa' }
    ];

    select.innerHTML = '';

    tiposFixos.forEach(tipo => {
        // Só adicionar se estiver disponível nas questões filtradas (ou se for "Todos")
        if (tipo.value === '' || tiposDisponiveis.includes(tipo.value)) {
            const option = document.createElement('option');
            option.value = tipo.value;
            option.textContent = tipo.text;
            select.appendChild(option);
        }
    });

    // Restaurar valor se ainda estiver disponível
    if (valorAtual && [...select.options].some(opt => opt.value === valorAtual)) {
        select.value = valorAtual;
    }
}

// Contar questões disponíveis com os filtros aplicados
async function contarQuestoesDisponiveis() {
    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        // Usar a função do Supabase para obter questões não respondidas
        const { data, error } = await supabaseClient
            .rpc('obter_questoes_nao_respondidas', {
                p_usuario_id: userId,
                p_filtros: filtrosAtuais,
                p_limite: 10000 // Limite alto só para contar
            });

        if (error) throw error;

        totalQuestoesDisponiveis = data.length;
        document.getElementById('totalQuestoesDisponiveis').textContent = totalQuestoesDisponiveis;

        // Atualizar limite do input de quantidade
        const inputQuantidade = document.getElementById('quantidadeQuestoes');
        inputQuantidade.max = Math.min(totalQuestoesDisponiveis, CONFIG.MAX_QUESTOES_POR_TESTE);

        // Ajustar valor se for maior que o disponível
        if (parseInt(inputQuantidade.value) > parseInt(inputQuantidade.max)) {
            inputQuantidade.value = inputQuantidade.max;
        }

        // Desabilitar botão se não houver questões
        const btnIniciar = document.getElementById('btnIniciarTeste');
        btnIniciar.disabled = totalQuestoesDisponiveis === 0;

    } catch (error) {
        console.error('Erro ao contar questões:', error);
        Utils.showNotification('Erro ao buscar questões disponíveis', 'error');
    }
}

// Limpar todos os filtros
async function limparFiltros() {
    document.getElementById('filtroInstituicao').value = '';
    document.getElementById('filtroProcesso').value = '';
    document.getElementById('filtroAno').value = '';
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroDificuldade').value = '';
    document.getElementById('filtroAssunto').value = '';
    document.getElementById('filtroSistema').value = '';
    document.getElementById('filtroCategoria').value = '';
    document.getElementById('filtroTopico').value = '';
    document.getElementById('filtroSubtopico').value = '';

    // Recarregar todas as opções originais
    await carregarOpcoesDosFiltros();

    await atualizarFiltros();
}

// Iniciar teste
async function iniciarTeste() {
    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        const modo = document.querySelector('input[name="modo"]:checked').value;
        const quantidade = parseInt(document.getElementById('quantidadeQuestoes').value);

        // Validar quantidade
        if (quantidade < 1) {
            Utils.showNotification('Digite uma quantidade válida de questões', 'warning');
            return;
        }

        if (quantidade > totalQuestoesDisponiveis) {
            Utils.showNotification(`Apenas ${totalQuestoesDisponiveis} questões disponíveis`, 'warning');
            return;
        }

        if (quantidade > CONFIG.MAX_QUESTOES_POR_TESTE) {
            Utils.showNotification(`Máximo de ${CONFIG.MAX_QUESTOES_POR_TESTE} questões por teste`, 'warning');
            return;
        }

        // Mostrar loading
        const btnIniciar = document.getElementById('btnIniciarTeste');
        const textoOriginal = btnIniciar.textContent;
        btnIniciar.disabled = true;
        btnIniciar.textContent = 'Carregando...';

        // Buscar questões
        const { data: questoes, error: questoesError } = await supabaseClient
            .rpc('obter_questoes_nao_respondidas', {
                p_usuario_id: userId,
                p_filtros: filtrosAtuais,
                p_limite: quantidade
            });

        if (questoesError) throw questoesError;

        if (questoes.length === 0) {
            Utils.showNotification('Nenhuma questão encontrada com esses filtros', 'warning');
            btnIniciar.disabled = false;
            btnIniciar.textContent = textoOriginal;
            return;
        }

        // Criar teste no banco
        const questoesIds = questoes.map(q => q.questao_id);

        const { data: teste, error: testeError } = await supabaseClient
            .from('testes')
            .insert([
                {
                    usuario_id: userId,
                    modo: modo,
                    questoes_ids: questoesIds,
                    filtros: filtrosAtuais,
                    status: 'em_andamento'
                }
            ])
            .select()
            .single();

        if (testeError) throw testeError;

        // Salvar dados do teste no localStorage temporariamente
        Utils.saveToStorage('testeAtual', {
            testeId: teste.id,
            modo: modo,
            questoes: questoes,
            questaoAtual: 0
        });

        // Redirecionar para página do teste
        window.location.href = `teste.html?id=${teste.id}`;

    } catch (error) {
        console.error('Erro ao iniciar teste:', error);
        Utils.showNotification('Erro ao criar teste: ' + error.message, 'error');

        // Restaurar botão
        const btnIniciar = document.getElementById('btnIniciarTeste');
        btnIniciar.disabled = false;
        btnIniciar.textContent = 'Iniciar Teste';
    }
}
