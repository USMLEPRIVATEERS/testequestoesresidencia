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
// NOVO SISTEMA DE SIGNUP EM DUAS ETAPAS
// ============================================

// Variável global para guardar dados temporários do signup
let signupTempData = {
    tempUserId: null,
    email: null,
    password: null,
    name: null,
    whatsapp: null
};

// ETAPA 1: Confirmar Dados - Salvar na tabela usuarios
async function confirmarDados(event) {
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
        console.log('🔵 [SIGNUP ETAPA 1] Verificando dados:', { name, email, whatsapp });

        // Desabilitar botão e mostrar loading
        const btnConfirmar = document.getElementById('btnConfirmarDados');
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Verificando...';

        // Verificar se usuário já existe na tabela
        const { data: existingUser, error: checkError } = await supabaseClient
            .from('usuarios')
            .select('id, email')
            .eq('email', email)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 = não encontrado, que é OK
            throw new Error('Erro ao verificar email: ' + checkError.message);
        }

        if (existingUser) {
            console.log('⚠️ [SIGNUP ETAPA 1] Email já existe na tabela:', email);
            mostrarStatus('error', '❌ Este email já está cadastrado. Faça login.');
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = '✓ Confirmar Dados';
            return;
        }

        // Gerar ID temporário único
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

        console.log('🔵 [SIGNUP ETAPA 1] Salvando na tabela usuarios:', dadosUsuario);

        // Inserir na tabela usuarios
        const { data: insertData, error: dbError } = await supabaseClient
            .from('usuarios')
            .insert([dadosUsuario])
            .select();

        if (dbError) {
            console.error('❌ [SIGNUP ETAPA 1] Erro ao inserir:', dbError);
            throw new Error('Erro ao salvar dados: ' + dbError.message);
        }

        console.log('✅ [SIGNUP ETAPA 1] Dados salvos com sucesso:', insertData);

        // Guardar dados temporários
        signupTempData = {
            tempUserId,
            email,
            password,
            name,
            whatsapp
        };

        // Mostrar mensagem de sucesso
        mostrarStatus('success', '✅ Dados confirmados! Agora clique em "Criar Conta e Entrar" para finalizar.');

        // Esconder botão Confirmar Dados e mostrar botão Criar Conta
        btnConfirmar.classList.add('hide');
        document.getElementById('btnCriarConta').classList.remove('hide');

        // Desabilitar inputs do formulário para evitar edição
        document.querySelectorAll('#registerForm input').forEach(input => {
            input.disabled = true;
        });

    } catch (error) {
        console.error('❌ [SIGNUP ETAPA 1] Erro:', error);

        let errorMessage = 'Erro ao confirmar dados';
        if (error.message) {
            errorMessage = error.message;
        }

        mostrarStatus('error', '❌ ' + errorMessage);

        // Reabilitar botão
        const btnConfirmar = document.getElementById('btnConfirmarDados');
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = '✓ Confirmar Dados';
    }
}

// ETAPA 2: Criar Conta no Auth - Finalizar signup
async function criarContaAuth(event) {
    event.preventDefault();

    if (!signupTempData.tempUserId) {
        Utils.showNotification('Erro: Dados temporários não encontrados. Recarregue a página.', 'error');
        return;
    }

    try {
        console.log('🔵 [SIGNUP ETAPA 2] Criando usuário no Auth...');

        // Desabilitar botão e mostrar loading
        const btnCriar = document.getElementById('btnCriarConta');
        btnCriar.disabled = true;
        btnCriar.textContent = 'Criando conta...';

        mostrarStatus('info', '⏳ Criando sua conta, aguarde...');

        // Criar usuário no Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: signupTempData.email,
            password: signupTempData.password,
            options: {
                data: {
                    name: signupTempData.name,
                    whatsapp: signupTempData.whatsapp,
                    temp_user_id: signupTempData.tempUserId
                }
            }
        });

        if (authError) {
            console.error('❌ [SIGNUP ETAPA 2] Erro no Auth:', authError);

            // Se email já está registrado no Auth, remover da tabela usuarios
            if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
                console.warn('⚠️ [SIGNUP ETAPA 2] Email já existe no Auth, removendo da tabela...');
                await supabaseClient
                    .from('usuarios')
                    .delete()
                    .eq('id', signupTempData.tempUserId);

                mostrarStatus('error', '❌ Este email já possui uma conta. Faça login.');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                return;
            }

            // Outro erro: remover da tabela usuarios
            await supabaseClient
                .from('usuarios')
                .delete()
                .eq('id', signupTempData.tempUserId);

            throw authError;
        }

        if (!authData || !authData.user) {
            // Remover da tabela se Auth falhou
            await supabaseClient
                .from('usuarios')
                .delete()
                .eq('id', signupTempData.tempUserId);
            throw new Error('Erro ao criar usuário no sistema de autenticação');
        }

        console.log('✅ [SIGNUP ETAPA 2] Usuário criado no Auth:', authData.user.id);

        // Atualizar o ID na tabela usuarios com o ID real do Auth
        console.log('🔵 [SIGNUP ETAPA 2] Atualizando ID na tabela usuarios...');

        const { error: updateError } = await supabaseClient
            .from('usuarios')
            .update({ id: authData.user.id })
            .eq('id', signupTempData.tempUserId);

        if (updateError) {
            console.error('❌ [SIGNUP ETAPA 2] Erro ao atualizar ID:', updateError);
            // Não vamos falhar aqui, o usuário já foi criado
        } else {
            console.log('✅ [SIGNUP ETAPA 2] ID atualizado com sucesso');
        }

        mostrarStatus('success', '✅ Conta criada com sucesso! Redirecionando...');

        // Limpar dados temporários
        signupTempData = { tempUserId: null, email: null, password: null, name: null, whatsapp: null };

        // Redirecionar para página de planos como novo usuário
        setTimeout(() => {
            window.location.href = 'index.html?new_user=true';
        }, 1500);

    } catch (error) {
        console.error('❌ [SIGNUP ETAPA 2] Erro:', error);

        let errorMessage = 'Erro ao criar conta';
        if (error.message) {
            errorMessage = error.message;
        }

        mostrarStatus('error', '❌ ' + errorMessage);

        // Reabilitar botão
        const btnCriar = document.getElementById('btnCriarConta');
        btnCriar.disabled = false;
        btnCriar.textContent = '🚀 Criar Conta e Entrar';
    }
}

// Função auxiliar para mostrar status do signup
function mostrarStatus(tipo, mensagem) {
    const statusDiv = document.getElementById('signupStatus');
    statusDiv.classList.remove('hide');
    statusDiv.textContent = mensagem;

    // Cores baseadas no tipo
    if (tipo === 'success') {
        statusDiv.style.backgroundColor = '#d1f7d1';
        statusDiv.style.borderColor = '#28a745';
        statusDiv.style.color = '#155724';
    } else if (tipo === 'error') {
        statusDiv.style.backgroundColor = '#f8d7da';
        statusDiv.style.borderColor = '#dc3545';
        statusDiv.style.color = '#721c24';
    } else if (tipo === 'info') {
        statusDiv.style.backgroundColor = '#d1ecf1';
        statusDiv.style.borderColor = '#17a2b8';
        statusDiv.style.color = '#0c5460';
    }
}
