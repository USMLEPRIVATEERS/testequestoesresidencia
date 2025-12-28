// ============================================
// PERFIL DE USUÁRIO
// ============================================

let userId = null;
let userData = null;
let currentPeriod = 30; // Dias

// Carregar perfil ao iniciar
window.addEventListener('DOMContentLoaded', async () => {
    const session = await Utils.checkAuth();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Pegar ID do usuário da URL
    const urlParams = new URLSearchParams(window.location.search);
    userId = urlParams.get('id');

    if (!userId) {
        mostrarErro();
        return;
    }

    await carregarPerfil();
});

// Carregar dados do perfil
async function carregarPerfil() {
    try {
        document.getElementById('loadingProfile').classList.remove('hide');
        document.getElementById('profileContent').classList.add('hide');
        document.getElementById('errorMessage').classList.add('hide');

        // Buscar dados do usuário
        const { data: usuario, error: usuarioError } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('id', userId)
            .single();

        if (usuarioError || !usuario) {
            throw new Error('Usuário não encontrado');
        }

        userData = usuario;

        // Renderizar header do perfil
        renderizarHeader();

        // Carregar estatísticas
        await carregarEstatisticas();

        // Carregar posição no ranking
        await carregarPosicaoRanking();

        // Carregar conquistas
        renderizarConquistas();

        // Carregar estatísticas por assunto
        await carregarEstatisticasPorAssunto();

        // Carregar atividade recente
        await carregarAtividadeRecente();

        document.getElementById('loadingProfile').classList.add('hide');
        document.getElementById('profileContent').classList.remove('hide');

    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        mostrarErro();
    }
}

// Renderizar header do perfil
function renderizarHeader() {
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

    if (userData.whatsapp) {
        const whatsappLink = document.createElement('a');
        whatsappLink.href = `https://wa.me/${userData.whatsapp.replace('+', '')}`;
        whatsappLink.target = '_blank';
        whatsappLink.className = 'social-link';
        whatsappLink.innerHTML = '💬 WhatsApp';
        socialLinks.appendChild(whatsappLink);
    }
}

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        // Usar função SQL para obter estatísticas do período
        const { data: statsPeriodo, error: errorPeriodo } = await supabaseClient
            .rpc('obter_estatisticas_perfil_periodo', {
                p_usuario_id: userId,
                p_dias: currentPeriod
            });

        if (errorPeriodo) throw errorPeriodo;

        // Atualizar UI com estatísticas do período
        document.getElementById('totalQuestoes').textContent = statsPeriodo.total_questoes;
        document.getElementById('totalCorretas').textContent = statsPeriodo.total_corretas;
        document.getElementById('totalIncorretas').textContent = statsPeriodo.total_incorretas;
        document.getElementById('porcentagemAcertos').textContent = statsPeriodo.porcentagem_acertos + '%';

        // Estatísticas gerais (sempre todo o período)
        const { data: statsGeral, error: errorGeral } = await supabaseClient
            .rpc('obter_estatisticas_perfil', {
                p_usuario_id: userId
            });

        if (errorGeral) throw errorGeral;

        document.getElementById('totalQuestoesGeral').textContent = statsGeral.total_questoes;
        document.getElementById('porcentagemGeral').textContent = statsGeral.porcentagem_acertos + '%';

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Carregar posição no ranking
async function carregarPosicaoRanking() {
    try {
        // Usar função SQL para obter posição no ranking
        const { data: posicao, error } = await supabaseClient
            .rpc('obter_posicao_ranking', {
                p_usuario_id: userId
            });

        if (error) throw error;

        if (posicao > 0) {
            document.getElementById('posicaoRanking').textContent = posicao + 'º';
        } else {
            document.getElementById('posicaoRanking').textContent = '-';
        }

    } catch (error) {
        console.error('Erro ao carregar posição no ranking:', error);
        document.getElementById('posicaoRanking').textContent = '-';
    }
}

// Renderizar conquistas
function renderizarConquistas() {
    const container = document.getElementById('achievementsContainer');
    container.innerHTML = '';

    const achievements = [];

    // Análise das estatísticas gerais
    const totalQuestoes = parseInt(document.getElementById('totalQuestoesGeral').textContent);
    const porcentagemGeral = parseInt(document.getElementById('porcentagemGeral').textContent);

    // Conquistas por quantidade de questões
    if (totalQuestoes >= 1000) {
        achievements.push({ name: '🏆 Mestre das Questões', desc: '1000+ questões respondidas', class: 'gold' });
    } else if (totalQuestoes >= 500) {
        achievements.push({ name: '🥈 Especialista', desc: '500+ questões respondidas', class: 'silver' });
    } else if (totalQuestoes >= 100) {
        achievements.push({ name: '🥉 Estudante Dedicado', desc: '100+ questões respondidas', class: 'bronze' });
    }

    // Conquistas por taxa de acerto
    if (porcentagemGeral >= 90 && totalQuestoes >= 50) {
        achievements.push({ name: '🎯 Precisão Cirúrgica', desc: '90%+ de acertos', class: 'gold' });
    } else if (porcentagemGeral >= 80 && totalQuestoes >= 50) {
        achievements.push({ name: '🎯 Excelente Desempenho', desc: '80%+ de acertos', class: 'silver' });
    } else if (porcentagemGeral >= 70 && totalQuestoes >= 50) {
        achievements.push({ name: '🎯 Bom Desempenho', desc: '70%+ de acertos', class: 'bronze' });
    }

    // Conquistas especiais
    const posicao = parseInt(document.getElementById('posicaoRanking').textContent);
    if (posicao === 1) {
        achievements.push({ name: '👑 Número 1', desc: '1º lugar no ranking', class: 'gold' });
    } else if (posicao === 2) {
        achievements.push({ name: '🥈 Vice-Campeão', desc: '2º lugar no ranking', class: 'silver' });
    } else if (posicao === 3) {
        achievements.push({ name: '🥉 Pódio', desc: '3º lugar no ranking', class: 'bronze' });
    } else if (posicao > 0 && posicao <= 10) {
        achievements.push({ name: '⭐ Top 10', desc: 'Entre os 10 melhores', class: 'silver' });
    }

    if (achievements.length === 0) {
        container.innerHTML = '<p style="color: var(--secondary-color);">Continue respondendo questões para conquistar badges!</p>';
    } else {
        achievements.forEach(achievement => {
            const badge = document.createElement('span');
            badge.className = `achievement-badge ${achievement.class}`;
            badge.innerHTML = `${achievement.name}<br><small>${achievement.desc}</small>`;
            container.appendChild(badge);
        });
    }
}

// Carregar estatísticas por assunto
async function carregarEstatisticasPorAssunto() {
    try {
        // Usar função SQL para obter estatísticas por assunto
        const { data: assuntos, error } = await supabaseClient
            .rpc('obter_estatisticas_por_assunto', {
                p_usuario_id: userId,
                p_dias: currentPeriod
            });

        if (error) throw error;

        // Renderizar
        const container = document.getElementById('assuntosStats');

        if (!assuntos || assuntos.length === 0) {
            container.innerHTML = '<p style="color: var(--secondary-color);">Nenhuma questão respondida neste período.</p>';
            return;
        }

        container.innerHTML = '<table class="ranking-table">' +
            '<thead><tr><th>Assunto</th><th>Questões</th><th>% Acertos</th></tr></thead>' +
            '<tbody>' +
            assuntos.map(a => `
                <tr>
                    <td>${a.assunto}</td>
                    <td>${a.total_questoes} questões</td>
                    <td>
                        <span class="stats-badge ${a.porcentagem_acertos >= 80 ? 'excellent' : a.porcentagem_acertos >= 60 ? 'good' : a.porcentagem_acertos >= 40 ? 'average' : 'low'}">
                            ${a.porcentagem_acertos}%
                        </span>
                        <span style="color: var(--secondary-color); font-size: 12px;"> (${a.total_corretas}/${a.total_questoes})</span>
                    </td>
                </tr>
            `).join('') +
            '</tbody></table>';

    } catch (error) {
        console.error('Erro ao carregar estatísticas por assunto:', error);
        document.getElementById('assuntosStats').innerHTML = '<p style="color: var(--error-color);">Erro ao carregar estatísticas.</p>';
    }
}

// Carregar atividade recente
async function carregarAtividadeRecente() {
    try {
        // Usar função SQL para obter atividade recente
        const { data: atividades, error } = await supabaseClient
            .rpc('obter_atividade_recente', {
                p_usuario_id: userId
            });

        if (error) throw error;

        const container = document.getElementById('atividadeRecente');

        if (!atividades || atividades.length === 0) {
            container.innerHTML = '<p style="color: var(--secondary-color);">Nenhum teste finalizado ainda.</p>';
            return;
        }

        container.innerHTML = '<ul style="list-style: none; padding: 0;">' +
            atividades.map(a => {
                const data = new Date(a.data_finalizacao);
                return `
                    <li style="padding: 15px; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${a.modo === 'aprendizado' ? '📚 Modo Aprendizado' : '📝 Modo Simulado'}</strong>
                                <div style="color: var(--secondary-color); font-size: 14px; margin-top: 5px;">
                                    ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div><strong>${a.total_questoes}</strong> questões</div>
                                <div>
                                    <span class="stats-badge ${a.porcentagem_acertos >= 80 ? 'excellent' : a.porcentagem_acertos >= 60 ? 'good' : a.porcentagem_acertos >= 40 ? 'average' : 'low'}">
                                        ${a.porcentagem_acertos}% acertos
                                    </span>
                                </div>
                            </div>
                        </div>
                    </li>
                `;
            }).join('') +
            '</ul>';

    } catch (error) {
        console.error('Erro ao carregar atividade recente:', error);
        document.getElementById('atividadeRecente').innerHTML = '<p style="color: var(--error-color);">Erro ao carregar atividades.</p>';
    }
}

// Mudar período
async function changePeriod(days) {
    currentPeriod = days;

    // Atualizar tabs
    document.querySelectorAll('.period-tab').forEach(tab => tab.classList.remove('active'));
    if (days === 30) {
        document.getElementById('tab30').classList.add('active');
    } else if (days === 90) {
        document.getElementById('tab90').classList.add('active');
    } else {
        document.getElementById('tabAll').classList.add('active');
    }

    // Recarregar estatísticas
    await carregarEstatisticas();
    await carregarEstatisticasPorAssunto();
}

// Mostrar erro
function mostrarErro() {
    document.getElementById('loadingProfile').classList.add('hide');
    document.getElementById('profileContent').classList.add('hide');
    document.getElementById('errorMessage').classList.remove('hide');
}
