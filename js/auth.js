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
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Atualizar último acesso
        await supabaseClient
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
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Construir WhatsApp completo a partir dos 3 campos
    const countryCode = document.getElementById('whatsappCountryCode').value;
    const ddd = document.getElementById('whatsappDDD').value;
    const number = document.getElementById('whatsappNumber').value;

    // Montar o WhatsApp completo
    const whatsapp = ddd ? `${countryCode}${ddd}${number}` : `${countryCode}${number}`;

    // Validar WhatsApp
    if (!whatsapp || whatsapp.length < 10) {
        Utils.showNotification('Preencha o WhatsApp corretamente!', 'error');
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
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        // Criar registro na tabela usuarios
        const { error: dbError } = await supabaseClient
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

        Utils.showNotification('Conta criada com sucesso! Escolha seu plano.', 'success');

        // Redirecionar para página de planos como novo usuário
        setTimeout(() => {
            window.location.href = 'planos.html?new_user=true';
        }, 1000);

    } catch (error) {
        console.error('Erro no registro:', error);
        Utils.showNotification('Erro ao criar conta: ' + error.message, 'error');
    }
}
