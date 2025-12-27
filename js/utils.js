// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

class Utils {
    // Verificar se usuário está autenticado
    static async checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    }

    // Redirecionar para login se não autenticado
    static async requireAuth() {
        const session = await this.checkAuth();
        if (!session) {
            window.location.href = 'index.html';
            return null;
        }
        return session;
    }

    // Fazer logout
    static async logout() {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    }

    // Formatar tempo em segundos para MM:SS
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Formatar tempo detalhado (ex: "2h 30min")
    static formatTimeDetailed(seconds) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        let result = '';
        if (hours > 0) result += `${hours}h `;
        if (mins > 0) result += `${mins}min `;
        if (hours === 0 && secs > 0) result += `${secs}s`;

        return result.trim() || '0s';
    }

    // Formatar data no formato brasileiro
    static formatDate(date) {
        return new Date(date).toLocaleDateString('pt-BR');
    }

    // Formatar data e hora
    static formatDateTime(date) {
        return new Date(date).toLocaleString('pt-BR');
    }

    // Calcular porcentagem
    static calcPercentage(part, total) {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    }

    // Mostrar notificação
    static showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Adicionar ao body
        document.body.appendChild(notification);

        // Remover após 3 segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Mostrar loading
    static showLoading(element) {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.innerHTML = '<div class="spinner"></div>';
        element.appendChild(loader);
        return loader;
    }

    // Remover loading
    static hideLoading(loader) {
        if (loader && loader.parentNode) {
            loader.remove();
        }
    }

    // Confirmar ação
    static async confirm(message) {
        return window.confirm(message);
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Salvar no localStorage
    static saveToStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // Obter do localStorage
    static getFromStorage(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    }

    // Remover do localStorage
    static removeFromStorage(key) {
        localStorage.removeItem(key);
    }

    // Gerar ID único
    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Validar email
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Escapar HTML para prevenir XSS
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Obter parâmetro da URL
    static getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // Definir parâmetro na URL
    static setUrlParameter(name, value) {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        window.history.pushState({}, '', url);
    }

    // Shuffle array (para randomizar questões)
    static shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
}

// Classe para gerenciar o usuário atual
class UserManager {
    static currentUser = null;

    static async getCurrentUser() {
        if (this.currentUser) return this.currentUser;

        const session = await Utils.checkAuth();
        if (!session) return null;

        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Erro ao buscar usuário:', error);
            return null;
        }

        this.currentUser = data;
        return data;
    }

    static async updateProvasSelecionadas(provas) {
        const session = await Utils.checkAuth();
        if (!session) return;

        const { error } = await supabase
            .from('usuarios')
            .update({ provas_selecionadas: provas })
            .eq('id', session.user.id);

        if (error) {
            console.error('Erro ao atualizar provas:', error);
            return false;
        }

        if (this.currentUser) {
            this.currentUser.provas_selecionadas = provas;
        }

        return true;
    }

    static clearCache() {
        this.currentUser = null;
    }
}
