// ============================================
// SISTEMA DE PLANOS E ASSINATURAS
// ============================================

const PlanoManager = {
    // Informações dos planos
    PLANOS: {
        free: {
            nome: 'Free',
            limite_diario: 10,
            preco: 0,
            duracao_dias: null
        },
        mensal: {
            nome: 'Mensal',
            limite_diario: null, // ilimitado
            preco: 60,
            duracao_dias: 30
        },
        semestral: {
            nome: 'Semestral',
            limite_diario: null, // ilimitado
            preco: 300,
            duracao_dias: 180
        },
        anual: {
            nome: 'Anual',
            limite_diario: null, // ilimitado
            preco: 500,
            duracao_dias: 365
        }
    },

    // Cache do plano do usuário
    planoAtual: null,

    // Carregar informações do plano do usuário
    async carregarPlano() {
        try {
            const session = await Utils.checkAuth();
            const userId = session.user.id;

            const { data, error } = await supabaseClient
                .from('usuarios')
                .select('plano, questoes_respondidas_hoje, ultima_atualizacao_contador, data_fim_plano')
                .eq('id', userId)
                .single();

            if (error) throw error;

            // Resetar contador se a data mudou
            const hoje = new Date().toISOString().split('T')[0];
            const ultimaAtualizacao = data.ultima_atualizacao_contador;

            if (ultimaAtualizacao !== hoje) {
                // Atualizar no banco
                await supabaseClient
                    .from('usuarios')
                    .update({
                        questoes_respondidas_hoje: 0,
                        ultima_atualizacao_contador: hoje
                    })
                    .eq('id', userId);

                data.questoes_respondidas_hoje = 0;
            }

            this.planoAtual = {
                tipo: data.plano,
                questoesHoje: data.questoes_respondidas_hoje,
                dataFim: data.data_fim_plano,
                config: this.PLANOS[data.plano]
            };

            return this.planoAtual;
        } catch (error) {
            console.error('Erro ao carregar plano:', error);
            return null;
        }
    },

    // Verificar se usuário pode criar teste com N questões
    async podeResponderQuestoes(numeroQuestoes) {
        const plano = this.planoAtual || await this.carregarPlano();

        if (!plano) {
            return { pode: false, motivo: 'Erro ao carregar plano' };
        }

        // Planos pagos: verificar se está ativo
        if (plano.tipo !== 'free') {
            if (plano.dataFim) {
                const dataFim = new Date(plano.dataFim);
                const agora = new Date();

                if (dataFim < agora) {
                    return {
                        pode: false,
                        motivo: 'Seu plano expirou',
                        acao: 'renovar'
                    };
                }
            }
            return { pode: true };
        }

        // Plano FREE: verificar limite diário
        const limiteDisponivel = plano.config.limite_diario - plano.questoesHoje;

        if (numeroQuestoes > limiteDisponivel) {
            return {
                pode: false,
                motivo: `Você tem ${limiteDisponivel} questões disponíveis hoje`,
                questoesDisponiveis: limiteDisponivel,
                acao: 'upgrade'
            };
        }

        return { pode: true, questoesDisponiveis: limiteDisponivel };
    },

    // Obter questões restantes para o dia
    async getQuestoesRestantes() {
        const plano = this.planoAtual || await this.carregarPlano();

        if (!plano || plano.tipo !== 'free') {
            return 999999; // "ilimitado" para planos pagos
        }

        return plano.config.limite_diario - plano.questoesHoje;
    },

    // Mostrar modal de upgrade
    mostrarModalUpgrade(motivo, questoesDisponiveis = 0) {
        const mensagem = questoesDisponiveis > 0
            ? `Você só tem ${questoesDisponiveis} questões disponíveis hoje. Faça upgrade para acesso ilimitado!`
            : 'Você atingiu o limite diário de 10 questões. Faça upgrade para continuar estudando!';

        if (confirm(`${mensagem}\n\nDeseja ver os planos disponíveis?`)) {
            window.location.href = 'planos.html';
        }
    },

    // Formatar informações do plano para exibição
    formatarInfoPlano(plano) {
        if (!plano) return 'Carregando...';

        if (plano.tipo === 'free') {
            const restantes = plano.config.limite_diario - plano.questoesHoje;
            return `Plano FREE - ${restantes}/10 questões hoje`;
        }

        const dataFim = plano.dataFim ? new Date(plano.dataFim) : null;
        if (dataFim) {
            const diasRestantes = Math.ceil((dataFim - new Date()) / (1000 * 60 * 60 * 24));
            return `Plano ${plano.config.nome} - ${diasRestantes} dias restantes`;
        }

        return `Plano ${plano.config.nome} - Ilimitado`;
    }
};

// Exportar para uso global
window.PlanoManager = PlanoManager;
