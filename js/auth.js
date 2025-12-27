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
        console.log('🔵 [SIGNUP] Iniciando cadastro com dados:', { name, email, whatsapp });

        // Verificar se usuário já existe na tabela
        const { data: existingUser } = await supabaseClient
            .from('usuarios')
            .select('id, email')
            .eq('email', email)
            .single();

        if (existingUser) {
            console.log('⚠️ [SIGNUP] Usuário já existe:', email);
            Utils.showNotification('Este email já está cadastrado. Faça login.', 'error');
            toggleForms();
            return;
        }

        // PASSO 1: Criar na tabela usuarios PRIMEIRO
        // Gerar um ID temporário único para o usuário
        const tempUserId = crypto.randomUUID();

        const dadosUsuario = {
            id: tempUserId,
            email: email,
            nome: name,
            whatsapp: whatsapp,
            plano: 'free',
            provas_selecionadas: [],
            questoes_respondidas_hoje: 0
        };

        console.log('🔵 [SIGNUP] PASSO 1: Inserindo na tabela usuarios PRIMEIRO:', dadosUsuario);

        const { data: insertData, error: dbError } = await supabaseClient
            .from('usuarios')
            .insert([dadosUsuario])
            .select();

        if (dbError) {
            console.error('❌ [SIGNUP] Erro ao inserir na tabela usuarios:', dbError);
            throw new Error('Erro ao salvar dados: ' + dbError.message);
        }

        console.log('✅ [SIGNUP] Dados salvos na tabela usuarios:', insertData);

        // Aguardar um momento
        await new Promise(resolve => setTimeout(resolve, 300));

        // PASSO 2: Criar no Auth DEPOIS
        console.log('🔵 [SIGNUP] PASSO 2: Criando usuário no Auth...');

        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    whatsapp: whatsapp,
                    temp_user_id: tempUserId
                }
            }
        });

        if (authError) {
            console.error('❌ [SIGNUP] Erro no Auth:', authError);

            // Se erro for "User already registered", deletar da tabela usuarios
            if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
                console.warn('⚠️ [SIGNUP] Email já registrado no Auth, removendo da tabela...');
                await supabaseClient
                    .from('usuarios')
                    .delete()
                    .eq('id', tempUserId);

                Utils.showNotification('Este email já está cadastrado. Faça login.', 'error');
                toggleForms();
                return;
            }

            // Outro erro: remover da tabela usuarios
            await supabaseClient
                .from('usuarios')
                .delete()
                .eq('id', tempUserId);

            throw authError;
        }

        if (!authData || !authData.user) {
            // Remover da tabela se Auth falhou
            await supabaseClient
                .from('usuarios')
                .delete()
                .eq('id', tempUserId);
            throw new Error('Erro ao criar usuário no sistema de autenticação');
        }

        console.log('✅ [SIGNUP] Usuário criado no Auth:', authData.user.id);

        // PASSO 3: Atualizar o ID na tabela usuarios com o ID real do Auth
        console.log('🔵 [SIGNUP] PASSO 3: Atualizando ID do usuário...');

        const { error: updateError } = await supabaseClient
            .from('usuarios')
            .update({ id: authData.user.id })
            .eq('id', tempUserId);

        if (updateError) {
            console.error('❌ [SIGNUP] Erro ao atualizar ID:', updateError);
            // Não vamos falhar aqui, o usuário já foi criado
        } else {
            console.log('✅ [SIGNUP] ID atualizado com sucesso');
        }

        Utils.showNotification('Conta criada com sucesso! Escolha seu plano.', 'success');

        // Redirecionar para página de planos como novo usuário
        setTimeout(() => {
            window.location.href = 'index.html?new_user=true';
        }, 1000);

    } catch (error) {
        console.error('❌ [SIGNUP] Erro geral no registro:', error);
        console.error('❌ [SIGNUP] Stack trace:', error.stack);

        // Melhorar mensagem de erro para o usuário
        let errorMessage = 'Erro ao criar conta';
        if (error.message.includes('already registered')) {
            errorMessage = 'Este email já está cadastrado. Faça login.';
        } else if (error.message) {
            errorMessage = 'Erro ao criar conta: ' + error.message;
        }

        Utils.showNotification(errorMessage, 'error');
    }
}
