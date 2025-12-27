// ============================================
// EXECUÇÃO DO TESTE
// ============================================

let testeData = null;
let questaoAtualIndex = 0;
let respostasUsuario = {};
let tempoInicio = null;
let timerInterval = null;
let respostaVisivel = false;

// Inicializar teste ao carregar a página
window.addEventListener('DOMContentLoaded', async () => {
    await Utils.requireAuth();
    await carregarTeste();
    iniciarTimer();
});

// Prevenir saída acidental da página
window.addEventListener('beforeunload', (event) => {
    if (testeData && testeData.status !== 'finalizado') {
        event.preventDefault();
        event.returnValue = 'Você tem um teste em andamento. Deseja realmente sair?';
    }
});

// Carregar dados do teste
async function carregarTeste() {
    try {
        // Obter ID do teste da URL
        const testeId = Utils.getUrlParameter('id');
        if (!testeId) {
            Utils.showNotification('Teste não encontrado', 'error');
            window.location.href = 'criar-teste.html';
            return;
        }

        // Tentar carregar do localStorage primeiro (mais rápido)
        const testeLocal = Utils.getFromStorage('testeAtual');

        if (testeLocal && testeLocal.testeId === testeId) {
            testeData = testeLocal;
        } else {
            // Se não tiver no localStorage, buscar do banco
            const { data: teste, error } = await supabaseClient
                .from('testes')
                .select('*')
                .eq('id', testeId)
                .single();

            if (error) throw error;

            // Buscar questões
            const { data: questoes, error: questoesError } = await supabaseClient
                .from('questoes')
                .select('*')
                .in('id', teste.questoes_ids);

            if (questoesError) throw questoesError;

            console.log('🟡 [DEBUG] Questões recebidas do banco:', questoes);
            console.log('🟡 [DEBUG] IDs esperados:', teste.questoes_ids);

            // Ordenar questões na mesma ordem de questoes_ids
            const questoesOrdenadas = teste.questoes_ids.map(id => {
                const questaoEncontrada = questoes.find(q => q.id === id);
                console.log(`🟡 [DEBUG] Procurando ID ${id}:`, questaoEncontrada ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
                if (questaoEncontrada) {
                    console.log(`🟡 [DEBUG] Questão encontrada tem ID:`, questaoEncontrada.id);
                }
                return questaoEncontrada;
            });

            console.log('🟡 [DEBUG] Questões ordenadas:', questoesOrdenadas);

            testeData = {
                testeId: teste.id,
                modo: teste.modo,
                questoes: questoesOrdenadas,
                questaoAtual: 0,
                status: teste.status
            };
        }

        // Verificar se teste já foi finalizado
        if (testeData.status === 'finalizado') {
            await carregarRespostasExistentes();
            mostrarResultadoFinal();
            return;
        }

        // Carregar respostas já dadas (caso teste tenha sido pausado)
        await carregarRespostasExistentes();

        // Renderizar interface
        renderizarListaQuestoes();
        renderizarQuestao();

        // Configurar modo
        document.getElementById('modoTeste').textContent =
            testeData.modo === 'aprendizado' ? 'Aprendizado' : 'Simulado';

    } catch (error) {
        console.error('Erro ao carregar teste:', error);
        Utils.showNotification('Erro ao carregar teste', 'error');
        setTimeout(() => {
            window.location.href = 'criar-teste.html';
        }, 2000);
    }
}

// Carregar respostas já dadas anteriormente
async function carregarRespostasExistentes() {
    try {
        const { data: respostas, error } = await supabaseClient
            .from('respostas_usuarios')
            .select('questao_id, resposta_usuario, status_resposta')
            .eq('teste_id', testeData.testeId);

        if (error) throw error;

        respostas.forEach(resposta => {
            respostasUsuario[resposta.questao_id] = {
                resposta: resposta.resposta_usuario,
                status: resposta.status_resposta
            };
        });

    } catch (error) {
        console.error('Erro ao carregar respostas:', error);
    }
}

// Renderizar lista de questões na sidebar
function renderizarListaQuestoes() {
    const lista = document.getElementById('questionList');
    lista.innerHTML = '';

    testeData.questoes.forEach((questao, index) => {
        const li = document.createElement('li');
        li.className = 'question-item';

        // Adicionar classe se foi respondida
        const resposta = respostasUsuario[questao.questao_id];
        if (resposta) {
            if (resposta.status === 'C') {
                li.classList.add('correct');
            } else if (resposta.status === 'I') {
                li.classList.add('incorrect');
            }
        }

        // Marcar questão atual
        if (index === questaoAtualIndex) {
            li.classList.add('active');
        }

        li.textContent = `Questão ${index + 1}`;
        li.onclick = () => irParaQuestao(index);

        lista.appendChild(li);
    });
}

// Renderizar questão atual
function renderizarQuestao() {
    const questao = testeData.questoes[questaoAtualIndex];
    console.log('🟠 [DEBUG] Renderizando questão:', questao);
    console.log('🟠 [DEBUG] ID da questão:', questao?.id);

    respostaVisivel = false;

    // Atualizar cabeçalho
    document.getElementById('questaoNumero').textContent = questaoAtualIndex + 1;
    document.getElementById('questaoTotal').textContent = testeData.questoes.length;

    // Informações da questão
    document.getElementById('questaoInfo').textContent =
        `${questao.instituicao} • ${questao.processo_seletivo} • ${questao.ano} • ${questao.assunto || 'Geral'}`;

    // Renderizar imagens (se houver)
    renderizarImagens(questao.imagens_urls);

    // Texto da questão
    document.getElementById('questaoTexto').textContent = questao.questao_texto;

    // Renderizar alternativas
    const container = document.getElementById('alternativasContainer');
    container.innerHTML = '';

    if (questao.tipo_questao === 'multipla_escolha' && questao.alternativas) {
        // Supabase retorna JSONB já como objeto, não precisa JSON.parse
        const alternativas = questao.alternativas;
        const respostaSalva = respostasUsuario[questao.questao_id]?.resposta;

        alternativas.forEach(alt => {
            const div = document.createElement('div');
            div.className = 'alternative';
            div.dataset.letra = alt.letra;

            if (respostaSalva === alt.letra) {
                div.classList.add('selected');
            }

            div.innerHTML = `
                <div class="alternative-radio"></div>
                <div style="flex: 1;">
                    <strong>${alt.letra})</strong> ${alt.texto}
                </div>
            `;

            // Click para selecionar
            div.onclick = () => selecionarAlternativa(alt.letra);

            // Click direito para riscar
            div.oncontextmenu = (e) => {
                e.preventDefault();
                div.classList.toggle('crossed');
            };

            container.appendChild(div);
        });
    }

    // Mostrar/esconder botão "Ver Resposta" (modo aprendizado)
    const btnVerResposta = document.getElementById('btnVerRespostaContainer');
    if (testeData.modo === 'aprendizado') {
        btnVerResposta.classList.remove('hide');
    } else {
        btnVerResposta.classList.add('hide');
    }

    // Esconder gabarito e resolução inicialmente
    document.getElementById('gabaritoContainer').classList.add('hide');
    document.getElementById('resolucaoContainer').classList.add('hide');
    document.getElementById('comentariosContainer').classList.add('hide');

    // Se já foi respondida em modo aprendizado, mostrar gabarito
    if (testeData.modo === 'aprendizado' && respostasUsuario[questao.questao_id]) {
        verResposta();
    }

    // Atualizar botões de navegação
    document.getElementById('btnAnterior').disabled = questaoAtualIndex === 0;
    document.getElementById('btnProxima').disabled = questaoAtualIndex === testeData.questoes.length - 1;
}

// Renderizar imagens da questão
function renderizarImagens(imagensUrls) {
    const container = document.getElementById('imagensContainer');
    container.innerHTML = '';

    // Se não houver imagens, esconder o container
    if (!imagensUrls || imagensUrls.length === 0) {
        return;
    }

    // Renderizar cada imagem
    imagensUrls.forEach((url, index) => {
        const imagemDiv = document.createElement('div');
        imagemDiv.className = 'imagem-container';

        const img = document.createElement('img');
        img.src = url;
        img.alt = `Imagem ${index + 1} da questão`;
        img.className = 'questao-imagem';

        // Adicionar evento de erro caso a imagem não carregue
        img.onerror = function() {
            this.style.display = 'none';
            const erro = document.createElement('p');
            erro.style.color = 'var(--error-color)';
            erro.textContent = `Erro ao carregar imagem ${index + 1}. URL: ${url}`;
            imagemDiv.appendChild(erro);
        };

        // Permitir abrir imagem em nova aba ao clicar
        img.onclick = function() {
            window.open(url, '_blank');
        };
        img.title = 'Clique para abrir em tela cheia';

        imagemDiv.appendChild(img);

        // Adicionar legenda se houver múltiplas imagens
        if (imagensUrls.length > 1) {
            const legenda = document.createElement('div');
            legenda.className = 'imagem-legenda';
            legenda.textContent = `Imagem ${index + 1} de ${imagensUrls.length}`;
            imagemDiv.appendChild(legenda);
        }

        container.appendChild(imagemDiv);
    });
}

// Selecionar alternativa
function selecionarAlternativa(letra) {
    // Remover seleção anterior
    document.querySelectorAll('.alternative').forEach(alt => {
        alt.classList.remove('selected');
    });

    // Adicionar nova seleção
    const alternativa = document.querySelector(`.alternative[data-letra="${letra}"]`);
    if (alternativa) {
        alternativa.classList.add('selected');
    }

    // Salvar resposta localmente (não envia ainda)
    const questao = testeData.questoes[questaoAtualIndex];

    if (!respostasUsuario[questao.questao_id]) {
        respostasUsuario[questao.questao_id] = {};
    }

    respostasUsuario[questao.questao_id].resposta = letra;
}

// Ver resposta (modo aprendizado)
async function verResposta() {
    if (respostaVisivel) return;

    const questao = testeData.questoes[questaoAtualIndex];
    console.log('🔴 [DEBUG] Ver Resposta - Questão atual:', questao);
    console.log('🔴 [DEBUG] Ver Resposta - ID da questão:', questao?.id);
    console.log('🔴 [DEBUG] Ver Resposta - questaoAtualIndex:', questaoAtualIndex);

    const respostaUsuarioAtual = respostasUsuario[questao.questao_id]?.resposta;

    if (!respostaUsuarioAtual) {
        Utils.showNotification('Selecione uma alternativa primeiro', 'warning');
        return;
    }

    console.log('🔴 [DEBUG] Vai salvar resposta com questao.questao_id:', questao.questao_id);

    // Salvar resposta no banco se ainda não foi salva
    if (!respostasUsuario[questao.questao_id].status) {
        await salvarResposta(questao.questao_id, respostaUsuarioAtual);
    }

    respostaVisivel = true;

    // Marcar alternativa correta e incorreta
    const gabarito = questao.gabarito;
    const correto = respostaUsuarioAtual === gabarito;

    document.querySelectorAll('.alternative').forEach(alt => {
        const letra = alt.dataset.letra;
        if (letra === gabarito) {
            alt.classList.add('correct');
        }
        if (letra === respostaUsuarioAtual && !correto) {
            alt.classList.add('incorrect');
        }
    });

    // Mostrar gabarito
    const gabaritoContainer = document.getElementById('gabaritoContainer');
    gabaritoContainer.classList.remove('hide');
    gabaritoContainer.innerHTML = `
        <div style="padding: 20px; border: 2px solid ${correto ? 'var(--success-color)' : 'var(--error-color)'};">
            <h3 style="color: ${correto ? 'var(--success-color)' : 'var(--error-color)'};">
                ${correto ? '✓ Correto!' : '✗ Incorreto'}
            </h3>
            <p><strong>Gabarito:</strong> ${gabarito}</p>
            <p><strong>Sua resposta:</strong> ${respostaUsuarioAtual}</p>
        </div>
    `;

    // Mostrar resolução comentada
    if (questao.resolucao_comentada) {
        const resolucaoContainer = document.getElementById('resolucaoContainer');
        resolucaoContainer.classList.remove('hide');
        resolucaoContainer.innerHTML = `
            <div class="resolucao-comentada">
                <h4>Resolução Comentada</h4>
                <p>${questao.resolucao_comentada}</p>
            </div>
        `;
    }

    // Carregar e mostrar comentários
    await carregarComentarios(questao.questao_id);

    // Atualizar lista de questões
    renderizarListaQuestoes();
}

// Salvar resposta no banco
async function salvarResposta(questaoId, resposta) {
    try {
        console.log('🔵 [DEBUG] Iniciando salvamento de resposta:', { questaoId, resposta });

        const session = await Utils.checkAuth();
        const userId = session.user.id;
        const questao = testeData.questoes.find(q => q.id === questaoId);

        console.log('🔵 [DEBUG] Dados do usuário e questão:', { userId, questao: questao?.questao_texto?.substring(0, 50) });

        const correto = resposta === questao.gabarito;
        const status = correto ? 'C' : 'I';

        console.log('🔵 [DEBUG] Status calculado:', { resposta, gabarito: questao.gabarito, correto, status });

        const dadosInsert = {
            usuario_id: userId,
            teste_id: testeData.testeId,
            questao_id: questaoId,
            resposta_usuario: resposta,
            status_resposta: status,
            tempo_resposta_segundos: Math.floor((Date.now() - tempoInicio) / 1000)
        };

        console.log('🔵 [DEBUG] Dados a serem inseridos:', dadosInsert);

        const { data, error } = await supabaseClient
            .from('respostas_usuarios')
            .insert([dadosInsert])
            .select();

        if (error) {
            console.error('❌ [DEBUG] Erro do Supabase:', error);
            throw error;
        }

        console.log('✅ [DEBUG] Resposta salva com sucesso!', data);

        // Atualizar cache local
        respostasUsuario[questaoId].status = status;

        Utils.showNotification(correto ? '✓ Correto!' : '✗ Incorreto', correto ? 'success' : 'info');

    } catch (error) {
        console.error('❌ [DEBUG] Erro ao salvar resposta:', error);
        console.error('❌ [DEBUG] Detalhes do erro:', JSON.stringify(error, null, 2));
        Utils.showNotification('Erro ao salvar resposta: ' + (error.message || 'Desconhecido'), 'error');
    }
}

// Carregar comentários de uma questão
async function carregarComentarios(questaoId) {
    try {
        const { data: comentarios, error } = await supabaseClient
            .from('comentarios')
            .select('*, usuarios(nome)')
            .eq('questao_id', questaoId)
            .order('data_criacao', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('comentariosContainer');
        container.classList.remove('hide');

        container.innerHTML = `
            <h4>Comentários</h4>
            <div class="mb-20">
                <textarea
                    id="novoComentario"
                    class="form-textarea"
                    placeholder="Adicione seu comentário..."
                    rows="3"
                ></textarea>
                <button class="btn btn-primary mt-10" onclick="adicionarComentario('${questaoId}')">
                    Adicionar Comentário
                </button>
            </div>
            <div id="listaComentarios">
                ${comentarios.length === 0 ? '<p>Nenhum comentário ainda.</p>' : comentarios.map(c => `
                    <div class="comentario-item">
                        <div class="comentario-header">
                            <strong>${c.usuarios?.nome || 'Usuário'}</strong>
                            <span>${Utils.formatDateTime(c.data_criacao)}</span>
                        </div>
                        <p>${Utils.escapeHtml(c.comentario_texto)}</p>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
    }
}

// Adicionar comentário
async function adicionarComentario(questaoId) {
    try {
        const session = await Utils.checkAuth();
        const texto = document.getElementById('novoComentario').value.trim();

        if (!texto) {
            Utils.showNotification('Digite um comentário', 'warning');
            return;
        }

        const { error } = await supabaseClient
            .from('comentarios')
            .insert([
                {
                    usuario_id: session.user.id,
                    questao_id: questaoId,
                    comentario_texto: texto
                }
            ]);

        if (error) throw error;

        Utils.showNotification('Comentário adicionado!', 'success');
        document.getElementById('novoComentario').value = '';
        await carregarComentarios(questaoId);

    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        Utils.showNotification('Erro ao adicionar comentário', 'error');
    }
}

// Navegação entre questões
function questaoAnterior() {
    if (questaoAtualIndex > 0) {
        questaoAtualIndex--;
        testeData.questaoAtual = questaoAtualIndex;
        Utils.saveToStorage('testeAtual', testeData);
        renderizarQuestao();
        renderizarListaQuestoes();
    }
}

function proximaQuestao() {
    if (questaoAtualIndex < testeData.questoes.length - 1) {
        questaoAtualIndex++;
        testeData.questaoAtual = questaoAtualIndex;
        Utils.saveToStorage('testeAtual', testeData);
        renderizarQuestao();
        renderizarListaQuestoes();
    }
}

function irParaQuestao(index) {
    questaoAtualIndex = index;
    testeData.questaoAtual = questaoAtualIndex;
    Utils.saveToStorage('testeAtual', testeData);
    renderizarQuestao();
    renderizarListaQuestoes();
}

// Toggle sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('closed');
}

// Timer
function iniciarTimer() {
    tempoInicio = Date.now();
    timerInterval = setInterval(atualizarTimer, 1000);
}

function atualizarTimer() {
    const tempoDecorrido = Math.floor((Date.now() - tempoInicio) / 1000);
    document.getElementById('timer').textContent = Utils.formatTime(tempoDecorrido);
}

// Pausar teste
async function pausarTeste() {
    const confirmacao = await Utils.confirm('Deseja pausar o teste? Você poderá continuar depois.');
    if (!confirmacao) return;

    try {
        // Atualizar status no banco
        const { error } = await supabaseClient
            .from('testes')
            .update({
                status: 'pausado',
                tempo_total_segundos: Math.floor((Date.now() - tempoInicio) / 1000)
            })
            .eq('id', testeData.testeId);

        if (error) throw error;

        clearInterval(timerInterval);
        Utils.showNotification('Teste pausado', 'info');
        window.location.href = 'testes-anteriores.html';

    } catch (error) {
        console.error('Erro ao pausar teste:', error);
        Utils.showNotification('Erro ao pausar teste', 'error');
    }
}

// Finalizar teste
async function finalizarTeste() {
    console.log('🟢 [DEBUG] Finalizando teste. Modo:', testeData.modo);
    console.log('🟢 [DEBUG] Respostas usuário:', respostasUsuario);

    // Verificar se todas as questões foram respondidas (modo simulado)
    if (testeData.modo === 'simulado') {
        const questoesRespondidas = Object.keys(respostasUsuario).length;
        console.log('🟢 [DEBUG] Questões respondidas:', questoesRespondidas, 'de', testeData.questoes.length);

        if (questoesRespondidas < testeData.questoes.length) {
            const confirmacao = await Utils.confirm(
                `Você respondeu ${questoesRespondidas} de ${testeData.questoes.length} questões. Deseja finalizar mesmo assim?`
            );
            if (!confirmacao) return;
        }

        // Salvar todas as respostas pendentes
        console.log('🟢 [DEBUG] Salvando respostas pendentes no modo simulado...');
        let respostasSalvas = 0;
        for (const questao of testeData.questoes) {
            const temResposta = respostasUsuario[questao.questao_id]?.resposta;
            const jaTemStatus = respostasUsuario[questao.questao_id]?.status;
            console.log(`🟢 [DEBUG] Questão ${questao.questao_id}: resposta=${temResposta}, status=${jaTemStatus}`);

            if (temResposta && !jaTemStatus) {
                console.log('🟢 [DEBUG] Salvando resposta pendente para questão:', questao.questao_id);
                await salvarResposta(questao.questao_id, respostasUsuario[questao.questao_id].resposta);
                respostasSalvas++;
            }
        }
        console.log(`🟢 [DEBUG] Total de respostas salvas no modo simulado: ${respostasSalvas}`);
    }

    try {
        // Atualizar teste como finalizado
        const tempoTotal = Math.floor((Date.now() - tempoInicio) / 1000);

        const { error } = await supabaseClient
            .from('testes')
            .update({
                status: 'finalizado',
                tempo_total_segundos: tempoTotal,
                data_finalizacao: new Date().toISOString()
            })
            .eq('id', testeData.testeId);

        if (error) throw error;

        clearInterval(timerInterval);
        testeData.status = 'finalizado';
        testeData.tempoTotal = tempoTotal;

        // Mostrar resultado
        mostrarResultadoFinal();

    } catch (error) {
        console.error('Erro ao finalizar teste:', error);
        Utils.showNotification('Erro ao finalizar teste', 'error');
    }
}

// Mostrar resultado final
async function mostrarResultadoFinal() {
    // Carregar respostas se necessário
    if (Object.keys(respostasUsuario).length === 0) {
        await carregarRespostasExistentes();
    }

    const corretas = Object.values(respostasUsuario).filter(r => r.status === 'C').length;
    const incorretas = Object.values(respostasUsuario).filter(r => r.status === 'I').length;
    const total = testeData.questoes.length;
    const porcentagem = Utils.calcPercentage(corretas, total);

    // Buscar tempo total do teste
    const { data: teste } = await supabaseClient
        .from('testes')
        .select('tempo_total_segundos')
        .eq('id', testeData.testeId)
        .single();

    const tempoTotal = teste?.tempo_total_segundos || 0;
    const tempoPorQuestao = Math.floor(tempoTotal / total);

    // Atualizar interface
    document.getElementById('resultadoCorretas').textContent = corretas;
    document.getElementById('resultadoIncorretas').textContent = incorretas;
    document.getElementById('resultadoPorcentagem').textContent = porcentagem + '%';
    document.getElementById('resultadoTempoTotal').textContent = Utils.formatTimeDetailed(tempoTotal);
    document.getElementById('resultadoTempoPorQuestao').textContent = Utils.formatTime(tempoPorQuestao);

    // Esconder questão e mostrar resultado
    document.getElementById('questaoContainer').classList.add('hide');
    document.getElementById('resultadoFinal').classList.remove('hide');

    // Esconder navegação
    document.querySelector('.question-navigation').style.display = 'none';
}

// Revisar questões após finalizar
function revisarQuestoes() {
    document.getElementById('questaoContainer').classList.remove('hide');
    document.getElementById('resultadoFinal').classList.add('hide');
    document.querySelector('.question-navigation').style.display = 'flex';

    questaoAtualIndex = 0;
    renderizarQuestao();
    renderizarListaQuestoes();

    // Forçar modo "revisão" - sempre mostrar gabarito
    testeData.modo = 'aprendizado';
}
