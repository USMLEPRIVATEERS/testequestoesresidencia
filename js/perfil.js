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
        window.location.href = 'index.html';
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
        const { data: usuario, error: usuarioError } = await supabase
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
        // Calcular data limite baseada no período
        let dataLimite = null;
        if (currentPeriod > 0) {
            dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - currentPeriod);
        }

        // Query base
        let query = supabase
            .from('respostas_usuarios')
            .select('status_resposta')
            .eq('usuario_id', userId);

        if (dataLimite) {
            query = query.gte('data_resposta', dataLimite.toISOString());
        }

        const { data: respostas, error } = await query;

        if (error) throw error;

        const totalQuestoes = respostas.length;
        const totalCorretas = respostas.filter(r => r.status_resposta === 'C').length;
        const totalIncorretas = respostas.filter(r => r.status_resposta === 'I').length;
        const porcentagemAcertos = totalQuestoes > 0
            ? Math.round((totalCorretas / totalQuestoes) * 100)
            : 0;

        // Atualizar UI
        document.getElementById('totalQuestoes').textContent = totalQuestoes;
        document.getElementById('totalCorretas').textContent = totalCorretas;
        document.getElementById('totalIncorretas').textContent = totalIncorretas;
        document.getElementById('porcentagemAcertos').textContent = porcentagemAcertos + '%';

        // Estatísticas gerais (sempre todo o período)
        const { data: todasRespostas } = await supabase
            .from('respostas_usuarios')
            .select('status_resposta')
            .eq('usuario_id', userId);

        const totalGeralQuestoes = todasRespostas.length;
        const totalGeralCorretas = todasRespostas.filter(r => r.status_resposta === 'C').length;
        const porcentagemGeral = totalGeralQuestoes > 0
            ? Math.round((totalGeralCorretas / totalGeralQuestoes) * 100)
            : 0;

        document.getElementById('totalQuestoesGeral').textContent = totalGeralQuestoes;
        document.getElementById('porcentagemGeral').textContent = porcentagemGeral + '%';

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Carregar posição no ranking
async function carregarPosicaoRanking() {
    try {
        // Buscar todos os usuários
        const { data: usuarios, error: usuariosError } = await supabase
            .from('usuarios')
            .select('id');

        if (usuariosError) throw usuariosError;

        // Calcular ranking (últimos 30 dias)
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);

        const rankingPromises = usuarios.map(async (usuario) => {
            const { data: respostas } = await supabase
                .from('respostas_usuarios')
                .select('status_resposta')
                .eq('usuario_id', usuario.id)
                .gte('data_resposta', dataLimite.toISOString());

            const total = respostas.length;
            return { id: usuario.id, total };
        });

        const results = await Promise.all(rankingPromises);

        // Ordenar por total de questões
        results.sort((a, b) => b.total - a.total);

        // Encontrar posição do usuário
        const posicao = results.findIndex(r => r.id === userId) + 1;

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
        // Calcular data limite baseada no período
        let dataLimite = null;
        if (currentPeriod > 0) {
            dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - currentPeriod);
        }

        // Buscar todas as respostas do usuário com dados das questões
        let query = supabase
            .from('respostas_usuarios')
            .select(`
                status_resposta,
                questoes (assunto)
            `)
            .eq('usuario_id', userId);

        if (dataLimite) {
            query = query.gte('data_resposta', dataLimite.toISOString());
        }

        const { data: respostas, error } = await query;

        if (error) throw error;

        // Agrupar por assunto
        const assuntosMap = new Map();

        respostas.forEach(resposta => {
            const assunto = resposta.questoes?.assunto || 'Sem assunto';
            if (!assuntosMap.has(assunto)) {
                assuntosMap.set(assunto, { total: 0, corretas: 0 });
            }
            const stats = assuntosMap.get(assunto);
            stats.total++;
            if (resposta.status_resposta === 'C') {
                stats.corretas++;
            }
        });

        // Converter para array e ordenar por total de questões
        const assuntos = Array.from(assuntosMap.entries())
            .map(([assunto, stats]) => ({
                assunto,
                total: stats.total,
                corretas: stats.corretas,
                porcentagem: Math.round((stats.corretas / stats.total) * 100)
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10); // Top 10 assuntos

        // Renderizar
        const container = document.getElementById('assuntosStats');

        if (assuntos.length === 0) {
            container.innerHTML = '<p style="color: var(--secondary-color);">Nenhuma questão respondida neste período.</p>';
            return;
        }

        container.innerHTML = '<table class="ranking-table">' +
            '<thead><tr><th>Assunto</th><th>Questões</th><th>% Acertos</th></tr></thead>' +
            '<tbody>' +
            assuntos.map(a => `
                <tr>
                    <td>${a.assunto}</td>
                    <td>${a.total} questões</td>
                    <td>
                        <span class="stats-badge ${a.porcentagem >= 80 ? 'excellent' : a.porcentagem >= 60 ? 'good' : a.porcentagem >= 40 ? 'average' : 'low'}">
                            ${a.porcentagem}%
                        </span>
                        <span style="color: var(--secondary-color); font-size: 12px;"> (${a.corretas}/${a.total})</span>
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
        // Buscar últimos 5 testes
        const { data: testes, error } = await supabase
            .from('testes')
            .select('*')
            .eq('usuario_id', userId)
            .eq('status', 'finalizado')
            .order('data_finalizacao', { ascending: false })
            .limit(5);

        if (error) throw error;

        const container = document.getElementById('atividadeRecente');

        if (testes.length === 0) {
            container.innerHTML = '<p style="color: var(--secondary-color);">Nenhum teste finalizado ainda.</p>';
            return;
        }

        // Para cada teste, buscar estatísticas
        const atividadesPromises = testes.map(async (teste) => {
            const { data: respostas } = await supabase
                .from('respostas_usuarios')
                .select('status_resposta')
                .eq('teste_id', teste.id);

            const total = respostas.length;
            const corretas = respostas.filter(r => r.status_resposta === 'C').length;
            const porcentagem = total > 0 ? Math.round((corretas / total) * 100) : 0;

            return {
                data: new Date(teste.data_finalizacao),
                modo: teste.modo,
                total,
                corretas,
                porcentagem
            };
        });

        const atividades = await Promise.all(atividadesPromises);

        container.innerHTML = '<ul style="list-style: none; padding: 0;">' +
            atividades.map(a => `
                <li style="padding: 15px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${a.modo === 'aprendizado' ? '📚 Modo Aprendizado' : '📝 Modo Simulado'}</strong>
                            <div style="color: var(--secondary-color); font-size: 14px; margin-top: 5px;">
                                ${a.data.toLocaleDateString('pt-BR')} às ${a.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div><strong>${a.total}</strong> questões</div>
                            <div>
                                <span class="stats-badge ${a.porcentagem >= 80 ? 'excellent' : a.porcentagem >= 60 ? 'good' : a.porcentagem >= 40 ? 'average' : 'low'}">
                                    ${a.porcentagem}% acertos
                                </span>
                            </div>
                        </div>
                    </div>
                </li>
            `).join('') +
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
