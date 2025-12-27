// ============================================
// AUTENTICAÇÃO - LOGIN E REGISTRO
// ============================================

// Verificar se usuário já está logado ao carregar a página
window.addEventListener('DOMContentLoaded', async () => {
    const session = await Utils.checkAuth();
    if (session) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Se URL tem #registro, mostrar formulário de registro
    if (window.location.hash === '#registro') {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm && registerForm) {
            loginForm.classList.add('hide');
            registerForm.classList.remove('hide');
        }
    }
});

// Alternar entre formulários de login e registro
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginForm.classList.toggle('hide');
    registerForm.classList.toggle('hide');
}

// Mostrar modal de reset de senha
function mostrarResetSenha() {
    const modal = document.getElementById('modalResetSenha');
    modal.classList.add('active');
}

// Fechar modal de reset de senha
function fecharResetSenha() {
    const modal = document.getElementById('modalResetSenha');
    modal.classList.remove('active');
    document.getElementById('formResetSenha').reset();
}

// Enviar email de reset de senha
async function enviarResetSenha(event) {
    event.preventDefault();

    const email = document.getElementById('resetEmail').value;

    try {
        console.log('🔵 [RESET] Enviando email de recuperação para:', email);

        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login.html?action=reset-password`,
        });

        if (error) {
            console.error('❌ [RESET] Erro ao enviar email:', error);
            throw error;
        }

        console.log('✅ [RESET] Resposta do Supabase:', data);

        // MODO DESENVOLVIMENTO: Se SMTP não configurado, oferecer alternativa
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (isDevelopment) {
            console.warn('⚠️ [RESET] MODO DESENVOLVIMENTO - SMTP pode não estar configurado');
            console.warn('⚠️ [RESET] Se o email não chegar, configure SMTP no Supabase Dashboard');
            console.warn('⚠️ [RESET] Ou use a alternativa abaixo:');

            // Oferecer criar nova senha diretamente
            Utils.showNotification(
                'Email enviado! Se não receber em 5min, verifique o SPAM ou contate o suporte.',
                'info'
            );
        } else {
            Utils.showNotification(
                'Email de recuperação enviado! Verifique sua caixa de entrada e SPAM.',
                'success'
            );
        }

        fecharResetSenha();

    } catch (error) {
        console.error('❌ [RESET] Erro ao enviar email de recuperação:', error);

        // Se for erro de SMTP não configurado
        if (error.message.includes('SMTP') || error.message.includes('email')) {
            Utils.showNotification(
                'O envio de emails ainda não está configurado. Entre em contato com o suporte.',
                'error'
            );
        } else {
            Utils.showNotification(
                'Erro ao enviar email: ' + error.message,
                'error'
            );
        }
    }
}

// Fechar modal ao clicar fora
window.addEventListener('click', (event) => {
    const modal = document.getElementById('modalResetSenha');
    if (modal && event.target === modal) {
        fecharResetSenha();
    }
});

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

// ============================================
// SISTEMA DE SIGNUP EM DUAS ETAPAS
// ============================================

// ETAPA 1: Criar conta no Auth (apenas email + senha)
async function handleRegister(event) {
    event.preventDefault();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

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
        console.log('🔵 [SIGNUP] Criando conta no Auth:', { email });

        // Criar usuário no Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (authError) {
            console.error('❌ [SIGNUP] Erro no Auth:', authError);
            throw authError;
        }

        if (!authData || !authData.user) {
            throw new Error('Erro ao criar usuário no sistema de autenticação');
        }

        console.log('✅ [SIGNUP] Conta criada no Auth:', authData.user.id);

        Utils.showNotification('Conta criada! Complete seu perfil.', 'success');

        // Abrir modal para completar perfil
        setTimeout(() => {
            document.getElementById('modalCompletarPerfil').classList.add('active');
        }, 500);

    } catch (error) {
        console.error('❌ [SIGNUP] Erro:', error);

        let errorMessage = 'Erro ao criar conta';
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            errorMessage = 'Este email já está cadastrado. Faça login.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        Utils.showNotification(errorMessage, 'error');
    }
}

// ETAPA 2: Salvar dados do perfil na tabela usuarios (com usuário autenticado)
async function salvarPerfilInicial(event) {
    event.preventDefault();

    const nome = document.getElementById('perfilNome').value;
    const countryCode = document.getElementById('perfilWhatsappCountryCode').value;
    const ddd = document.getElementById('perfilWhatsappDDD').value;
    const number = document.getElementById('perfilWhatsappNumber').value;
    const instagram = document.getElementById('perfilInstagram').value;

    // Montar WhatsApp completo
    const whatsapp = ddd ? `${countryCode}${ddd}${number}` : `${countryCode}${number}`;

    // Validar WhatsApp
    if (!whatsapp || whatsapp.length < 10) {
        Utils.showNotification('Preencha o WhatsApp corretamente!', 'error');
        return;
    }

    try {
        console.log('🔵 [COMPLETAR PERFIL] Salvando dados do perfil...');

        // Pegar usuário autenticado
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        const dadosUsuario = {
            id: user.id,
            email: user.email,
            nome: nome,
            whatsapp: whatsapp,
            instagram: instagram || null,
            plano: 'free',
            provas_selecionadas: [],
            questoes_respondidas_hoje: 0
        };

        console.log('🔵 [COMPLETAR PERFIL] Salvando na tabela usuarios:', dadosUsuario);

        // UPSERT na tabela usuarios (insere se não existir, atualiza se já existir)
        // Isso resolve o caso de triggers automáticos ou tentativas anteriores
        const { data: upsertData, error: dbError } = await supabaseClient
            .from('usuarios')
            .upsert([dadosUsuario], { onConflict: 'id' })
            .select();

        if (dbError) {
            console.error('❌ [COMPLETAR PERFIL] Erro ao salvar:', dbError);
            throw new Error('Erro ao salvar perfil: ' + dbError.message);
        }

        console.log('✅ [COMPLETAR PERFIL] Perfil salvo com sucesso:', upsertData);

        Utils.showNotification('Perfil completado! Redirecionando...', 'success');

        // Fechar modal e redirecionar para planos
        setTimeout(() => {
            window.location.href = 'index.html?new_user=true';
        }, 1000);

    } catch (error) {
        console.error('❌ [COMPLETAR PERFIL] Erro:', error);

        let errorMessage = 'Erro ao salvar perfil';
        if (error.message) {
            errorMessage = error.message;
        }

        Utils.showNotification(errorMessage, 'error');
    }
}
