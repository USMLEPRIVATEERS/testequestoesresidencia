// ============================================
// AUTENTICAÇÃO - LOGIN E REGISTRO
// ============================================

// Verificar se usuário já está logado ao carregar a página
window.addEventListener('DOMContentLoaded', async () => {
    const session = await Utils.checkAuth();
    if (session) {
        window.location.href = 'dashboard.html';
    }
});

// Alternar entre formulários de login e registro
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginForm.classList.toggle('hide');
    registerForm.classList.toggle('hide');
}

// Manipular login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        // Fazer login com Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Atualizar último acesso
        await supabase
            .from('usuarios')
            .update({ ultimo_acesso: new Date().toISOString() })
            .eq('id', data.user.id);

        Utils.showNotification('Login realizado com sucesso!', 'success');

        // Redirecionar para dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);

    } catch (error) {
        console.error('Erro no login:', error);
        Utils.showNotification('Erro ao fazer login: ' + error.message, 'error');
    }
}

// Manipular registro
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const whatsapp = document.getElementById('registerWhatsapp').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Validar WhatsApp
    const whatsappRegex = /^\+[0-9]{12,15}$/;
    if (!whatsappRegex.test(whatsapp)) {
        Utils.showNotification('WhatsApp inválido! Use o formato: +5511999999999', 'error');
        return;
    }

    // Validar senhas
    if (password !== passwordConfirm) {
        Utils.showNotification('As senhas não coincidem!', 'error');
        return;
    }

    if (password.length < 6) {
        Utils.showNotification('A senha deve ter no mínimo 6 caracteres!', 'error');
        return;
    }

    try {
        // Criar usuário no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        // Criar registro na tabela usuarios
        const { error: dbError } = await supabase
            .from('usuarios')
            .insert([
                {
                    id: authData.user.id,
                    email: email,
                    nome: name,
                    whatsapp: whatsapp,
                    provas_selecionadas: [],
                }
            ]);

        if (dbError) throw dbError;

        Utils.showNotification('Conta criada com sucesso! Faça login para continuar.', 'success');

        // Voltar para o formulário de login
        setTimeout(() => {
            toggleForms();
            document.getElementById('loginEmail').value = email;
        }, 1000);

    } catch (error) {
        console.error('Erro no registro:', error);
        Utils.showNotification('Erro ao criar conta: ' + error.message, 'error');
    }
}
