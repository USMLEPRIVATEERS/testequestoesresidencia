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
        console.log('📊 [DASHBOARD] Provas selecionadas:', provasSelecionadas);

        // Total de questões disponíveis nas provas selecionadas
        let totalQuestoesQuery = supabaseClient
            .from('questoes')
            .select('id', { count: 'exact', head: true });

        if (provasSelecionadas.length > 0) {
            totalQuestoesQuery = totalQuestoesQuery.in('processo_seletivo', provasSelecionadas);
        }

        const { count: totalQuestoes } = await totalQuestoesQuery;
        console.log('📊 [DASHBOARD] Total de questões nas provas selecionadas:', totalQuestoes);

        // Questões respondidas pelo usuário DAS PROVAS SELECIONADAS (não de todas as provas)
        let respostasQuery = supabaseClient
            .from('respostas_usuarios')
            .select(`
                status_resposta,
                questoes!inner (processo_seletivo)
            `)
            .eq('usuario_id', userId);

        // Filtrar apenas respostas das provas selecionadas
        if (provasSelecionadas.length > 0) {
            respostasQuery = respostasQuery.in('questoes.processo_seletivo', provasSelecionadas);
        }

        const { data: respostas, error: respostasError } = await respostasQuery;

        if (respostasError) {
            console.error('❌ [DASHBOARD] Erro ao buscar respostas:', respostasError);
            throw respostasError;
        }

        console.log('📊 [DASHBOARD] Respostas das provas selecionadas:', respostas.length, respostas);

        const questoesRealizadas = respostas.length;
        const questoesCorretas = respostas.filter(r => r.status_resposta === 'C').length;
        const questoesIncorretas = respostas.filter(r => r.status_resposta === 'I').length;

        // Calcular questões restantes (das provas selecionadas)
        const questoesRestantes = Math.max(0, (totalQuestoes || 0) - questoesRealizadas);

        console.log('📊 [DASHBOARD] Cálculo final:');
        console.log('  - Total questões:', totalQuestoes);
        console.log('  - Questões realizadas:', questoesRealizadas);
        console.log('  - Questões restantes:', questoesRestantes);

        const percentualConcluido = Utils.calcPercentage(questoesRealizadas, totalQuestoes);
        const percentualAcertos = Utils.calcPercentage(questoesCorretas, questoesRealizadas);

        // Atualizar interface
        document.getElementById('totalQuestoes').textContent = questoesRestantes;
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
        const { data: provas, error } = await supabaseClient
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
        const { data, error } = await supabaseClient
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

// ============================================
// EDIÇÃO DE PERFIL
// ============================================

// Abrir modal de edição de perfil
async function abrirModalEditarPerfil() {
    try {
        const session = await Utils.checkAuth();
        const userId = session.user.id;

        // Buscar dados atuais do usuário
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('nome, email, whatsapp, instagram')
            .eq('id', userId)
            .single();

        if (error) throw error;

        console.log('🔵 [EDIT] Dados atuais:', data);

        // Preencher formulário
        document.getElementById('editNome').value = data.nome || '';
        document.getElementById('editEmail').value = data.email || '';
        document.getElementById('editInstagram').value = data.instagram || '';

        // Parsear WhatsApp
        if (data.whatsapp) {
            const whatsapp = data.whatsapp;
            console.log('🔵 [EDIT] WhatsApp original:', whatsapp);

            // Get all country codes from the select dropdown (source of truth)
            const select = document.getElementById('editWhatsappCountryCode');
            const allCountryCodes = Array.from(select.options).map(opt => opt.value);

            // Sort by length descending to match longest codes first (e.g., +123 before +12)
            allCountryCodes.sort((a, b) => b.length - a.length);

            console.log('🔵 [EDIT] Country codes disponíveis:', allCountryCodes.slice(0, 5), '...');

            // Find matching country code
            let countryCode = null;
            let restNumber = whatsapp;

            for (const code of allCountryCodes) {
                if (whatsapp.startsWith(code)) {
                    countryCode = code;
                    restNumber = whatsapp.substring(code.length);
                    break;
                }
            }

            console.log('🔵 [EDIT] Country code extraído:', countryCode);
            console.log('🔵 [EDIT] Resto do número:', restNumber, '(length:', restNumber.length + ')');

            if (countryCode) {
                document.getElementById('editWhatsappCountryCode').value = countryCode;
                console.log('🔵 [EDIT] Country code setado no select:', document.getElementById('editWhatsappCountryCode').value);

                // Se for Brasil (+55), separar DDD e número
                if (countryCode === '+55' && restNumber.length >= 10) {
                    const ddd = restNumber.substring(0, 2);
                    const numero = restNumber.substring(2);
                    console.log('🔵 [EDIT] É Brasil! DDD:', ddd, 'Número:', numero);

                    document.getElementById('editWhatsappDDD').value = ddd;
                    document.getElementById('editWhatsappNumber').value = numero;

                    console.log('🔵 [EDIT] Valores setados:');
                    console.log('  ✓ DDD input:', document.getElementById('editWhatsappDDD').value);
                    console.log('  ✓ Número input:', document.getElementById('editWhatsappNumber').value);
                } else {
                    // Outros países: colocar tudo no número
                    console.log('🔵 [EDIT] Não é Brasil, número completo:', restNumber);
                    document.getElementById('editWhatsappDDD').value = '';
                    document.getElementById('editWhatsappNumber').value = restNumber;
                }
            } else {
                console.warn('⚠️ [EDIT] Nenhum country code correspondente encontrado!');
            }
        }

        console.log('🟡 [EDIT] ANTES de chamar updateEditWhatsappFields():');
        console.log('  - Country:', document.getElementById('editWhatsappCountryCode').value);
        console.log('  - DDD:', document.getElementById('editWhatsappDDD').value);
        console.log('  - Número:', document.getElementById('editWhatsappNumber').value);

        // NÃO chamar updateEditWhatsappFields - pode estar bagunçando os valores!
        // setTimeout(() => {
        //     updateEditWhatsappFields();
        // }, 100);

        // Mostrar modal
        document.getElementById('modalEditarPerfil').classList.add('active');

    } catch (error) {
        console.error('Erro ao carregar dados do perfil:', error);
        Utils.showNotification('Erro ao carregar dados do perfil.', 'error');
    }
}

// Fechar modal de edição
function fecharModalEditarPerfil() {
    document.getElementById('modalEditarPerfil').classList.remove('active');
    document.getElementById('formEditarPerfil').reset();
}

// Atualizar campos de WhatsApp no modal de edição
function updateEditWhatsappFields() {
    const select = document.getElementById('editWhatsappCountryCode');
    if (!select || !select.options || select.selectedIndex === -1) {
        console.warn('⚠️ [EDIT] Select de WhatsApp não encontrado ou sem opções');
        return;
    }

    const option = select.options[select.selectedIndex];
    if (!option) {
        console.warn('⚠️ [EDIT] Opção selecionada não encontrada');
        return;
    }

    const dddLength = option.getAttribute('data-ddd-length');
    const dddInput = document.getElementById('editWhatsappDDD');

    if (!dddInput) {
        console.warn('⚠️ [EDIT] Input de DDD não encontrado');
        return;
    }

    if (dddLength === '0') {
        // Países sem DDD
        dddInput.style.display = 'none';
        dddInput.required = false;
        dddInput.value = '';
    } else {
        // Países com DDD
        dddInput.style.display = 'block';
        dddInput.required = true;
        dddInput.maxLength = dddLength;
    }
}

// Salvar dados do perfil
async function salvarDadosPerfil(event) {
    event.preventDefault();

    const nome = document.getElementById('editNome').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const instagram = document.getElementById('editInstagram').value.trim();

    // Construir WhatsApp
    const countryCode = document.getElementById('editWhatsappCountryCode').value;
    const ddd = document.getElementById('editWhatsappDDD').value.trim();
    const number = document.getElementById('editWhatsappNumber').value.trim();

    const whatsapp = ddd ? `${countryCode}${ddd}${number}` : `${countryCode}${number}`;

    // Validar WhatsApp
    if (!whatsapp || whatsapp.length < 10) {
        Utils.showNotification('Preencha o WhatsApp corretamente!', 'error');
        return;
    }

    try {
        console.log('🔵 [EDIT] Salvando dados:', { nome, email, whatsapp, instagram });

        const session = await Utils.checkAuth();
        const userId = session.user.id;

        // Preparar dados para atualização
        const dadosAtualizacao = {
            nome: nome,
            whatsapp: whatsapp,
            instagram: instagram || null
        };

        console.log('🔵 [EDIT] Dados a serem salvos:', dadosAtualizacao);

        // Atualizar na tabela usuarios
        const { data, error } = await supabaseClient
            .from('usuarios')
            .update(dadosAtualizacao)
            .eq('id', userId)
            .select();

        if (error) {
            console.error('❌ [EDIT] Erro ao atualizar tabela usuarios:', error);
            throw error;
        }

        console.log('✅ [EDIT] Dados atualizados na tabela usuarios:', data);

        // Se o email mudou, atualizar no Supabase Auth também
        if (email !== currentUser.email) {
            console.log('🔵 [EDIT] Email mudou, atualizando no Auth...');

            const { error: authError } = await supabaseClient.auth.updateUser({
                email: email
            });

            if (authError) {
                console.error('❌ [EDIT] Erro ao atualizar email no Auth:', authError);
                Utils.showNotification(
                    'Dados atualizados, mas erro ao mudar email. Você receberá um email de confirmação.',
                    'warning'
                );
            } else {
                console.log('✅ [EDIT] Email atualizado no Auth');
                Utils.showNotification(
                    'Dados atualizados! Verifique seu email para confirmar a mudança de email.',
                    'success'
                );
            }

            // Atualizar email na tabela usuarios também
            await supabaseClient
                .from('usuarios')
                .update({ email: email })
                .eq('id', userId);
        } else {
            Utils.showNotification('Dados atualizados com sucesso!', 'success');
        }

        // Atualizar dados locais
        currentUser.nome = nome;
        currentUser.email = email;
        currentUser.whatsapp = whatsapp;
        currentUser.instagram = instagram;

        // Atualizar mensagem de boas-vindas
        document.getElementById('welcomeMessage').textContent = `Bem-vindo, ${nome}!`;

        // Fechar modal
        fecharModalEditarPerfil();

    } catch (error) {
        console.error('❌ [EDIT] Erro ao salvar dados:', error);
        console.error('❌ [EDIT] Detalhes:', JSON.stringify(error, null, 2));
        Utils.showNotification('Erro ao salvar dados: ' + error.message, 'error');
    }
}

// Fechar modal ao clicar fora
window.addEventListener('click', (event) => {
    const modal = document.getElementById('modalEditarPerfil');
    if (modal && event.target === modal) {
        fecharModalEditarPerfil();
    }
});
