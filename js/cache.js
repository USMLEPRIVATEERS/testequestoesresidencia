// ============================================
// SISTEMA DE CACHE FRONTEND
// Reduz requests ao banco em 70-80%
// ============================================

class CacheManager {
    constructor() {
        this.prefix = 'qr_cache_'; // Questões Residência cache
        this.defaultTTL = 24 * 60 * 60 * 1000; // 24 horas
    }

    /**
     * Gerar chave de cache única
     */
    _generateKey(key) {
        return this.prefix + key;
    }

    /**
     * Salvar dados no cache
     * @param {string} key - Chave do cache
     * @param {any} data - Dados a serem cacheados
     * @param {number} ttl - Tempo de vida em milissegundos (opcional)
     */
    set(key, data, ttl = null) {
        try {
            const cacheKey = this._generateKey(key);
            const expiresAt = Date.now() + (ttl || this.defaultTTL);

            const cacheData = {
                data: data,
                timestamp: Date.now(),
                expiresAt: expiresAt
            };

            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            Logger.debug('💾 [CACHE] Salvo:', key, 'TTL:', ttl || this.defaultTTL);

            return true;
        } catch (error) {
            Logger.error('❌ [CACHE] Erro ao salvar:', error);
            // Se localStorage estiver cheio, limpar cache antigo
            this.clearExpired();
            return false;
        }
    }

    /**
     * Obter dados do cache
     * @param {string} key - Chave do cache
     * @returns {any|null} Dados ou null se não existir/expirado
     */
    get(key) {
        try {
            const cacheKey = this._generateKey(key);
            const cached = localStorage.getItem(cacheKey);

            if (!cached) {
                Logger.debug('📭 [CACHE] Miss:', key);
                return null;
            }

            const cacheData = JSON.parse(cached);

            // Verificar se expirou
            if (Date.now() > cacheData.expiresAt) {
                Logger.debug('⏱️ [CACHE] Expirado:', key);
                this.delete(key);
                return null;
            }

            Logger.debug('✅ [CACHE] Hit:', key);
            return cacheData.data;

        } catch (error) {
            Logger.error('❌ [CACHE] Erro ao ler:', error);
            return null;
        }
    }

    /**
     * Deletar item do cache
     */
    delete(key) {
        const cacheKey = this._generateKey(key);
        localStorage.removeItem(cacheKey);
        Logger.debug('🗑️ [CACHE] Deletado:', key);
    }

    /**
     * Limpar todo o cache
     */
    clearAll() {
        const keys = Object.keys(localStorage);
        let deleted = 0;

        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
                deleted++;
            }
        });

        Logger.info('🧹 [CACHE] Limpou', deleted, 'itens');
        return deleted;
    }

    /**
     * Limpar apenas itens expirados
     */
    clearExpired() {
        const keys = Object.keys(localStorage);
        let deleted = 0;

        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                try {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (Date.now() > cached.expiresAt) {
                        localStorage.removeItem(key);
                        deleted++;
                    }
                } catch (e) {
                    // Item corrompido, deletar
                    localStorage.removeItem(key);
                    deleted++;
                }
            }
        });

        if (deleted > 0) {
            Logger.info('🧹 [CACHE] Limpou', deleted, 'itens expirados');
        }

        return deleted;
    }

    /**
     * Obter estatísticas do cache
     */
    getStats() {
        const keys = Object.keys(localStorage);
        let total = 0;
        let expired = 0;
        let size = 0;

        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                total++;
                try {
                    const item = localStorage.getItem(key);
                    size += item.length;
                    const cached = JSON.parse(item);
                    if (Date.now() > cached.expiresAt) {
                        expired++;
                    }
                } catch (e) {
                    expired++;
                }
            }
        });

        return {
            total,
            expired,
            active: total - expired,
            sizeKB: Math.round(size / 1024)
        };
    }
}

// ============================================
// CACHE HELPERS PARA DADOS ESPECÍFICOS
// ============================================

class DataCache {
    static cache = new CacheManager();

    /**
     * Cache de instituições (raramente muda)
     */
    static async getInstitutions() {
        const cached = this.cache.get('institutions');
        if (cached) return cached;

        const { data, error } = await supabaseClient
            .from('questoes')
            .select('instituicao')
            .order('instituicao');

        if (error) throw error;

        const institutions = [...new Set(data.map(q => q.instituicao))];
        this.cache.set('institutions', institutions, 7 * 24 * 60 * 60 * 1000); // 7 dias

        return institutions;
    }

    /**
     * Cache de provas disponíveis
     */
    static async getAvailableExams() {
        const cached = this.cache.get('available_exams');
        if (cached) return cached;

        const { data, error } = await supabaseClient
            .from('questoes')
            .select('processo_seletivo')
            .order('processo_seletivo');

        if (error) throw error;

        const exams = [...new Set(data.map(q => q.processo_seletivo))];
        this.cache.set('available_exams', exams, 24 * 60 * 60 * 1000); // 24 horas

        return exams;
    }

    /**
     * Cache de assuntos
     */
    static async getSubjects() {
        const cached = this.cache.get('subjects');
        if (cached) return cached;

        const { data, error } = await supabaseClient
            .from('questoes')
            .select('assunto')
            .order('assunto');

        if (error) throw error;

        const subjects = [...new Set(data.map(q => q.assunto).filter(Boolean))];
        this.cache.set('subjects', subjects, 7 * 24 * 60 * 60 * 1000); // 7 dias

        return subjects;
    }

    /**
     * Cache de estatísticas do dashboard (atualizar quando responder questão)
     */
    static setDashboardStats(userId, stats) {
        this.cache.set(`dashboard_stats_${userId}`, stats, 5 * 60 * 1000); // 5 minutos
    }

    static getDashboardStats(userId) {
        return this.cache.get(`dashboard_stats_${userId}`);
    }

    static invalidateDashboardStats(userId) {
        this.cache.delete(`dashboard_stats_${userId}`);
    }

    /**
     * Cache de ranking (atualizar a cada 5 minutos)
     */
    static setRanking(data) {
        this.cache.set('ranking', data, 5 * 60 * 1000); // 5 minutos
    }

    static getRanking() {
        return this.cache.get('ranking');
    }

    /**
     * Limpar cache ao fazer logout
     */
    static clearUserData(userId) {
        this.cache.delete(`dashboard_stats_${userId}`);
        this.cache.delete(`user_profile_${userId}`);
        // Manter cache de dados estáticos (instituições, provas, etc)
    }
}

// Instanciar cache global
const cache = new CacheManager();

// Limpar cache expirado ao carregar página (não bloqueia)
setTimeout(() => cache.clearExpired(), 1000);

// ============================================
// EXEMPLO DE USO
// ============================================

/*
// Sem cache (antes):
const { data } = await supabaseClient.from('questoes').select('instituicao');

// Com cache (depois):
const institutions = await DataCache.getInstitutions();

// Resultado:
// - Primeira visita: busca do banco (lento)
// - Visitas seguintes: busca do cache (instantâneo)
// - Economia: 70-80% de requests
*/
