// ============================================
// CONFIGURAÇÃO DO SUPABASE - EXEMPLO
// ============================================

// INSTRUÇÕES:
// 1. Copie este arquivo e renomeie para: config.js
// 2. Substitua as variáveis abaixo com suas credenciais reais do Supabase
// 3. Nunca commit o arquivo config.js no Git (está no .gitignore)

// IMPORTANTE: Substitua estas variáveis com as suas credenciais do Supabase
// Você encontra essas informações em: Project Settings > API

const SUPABASE_URL = 'https://seu-projeto.supabase.co'; // Substitua aqui
const SUPABASE_ANON_KEY = 'sua-chave-anonima-aqui'; // Substitua aqui

// Inicializar cliente Supabase
if (!window.supabase) {
    console.error('Erro: Biblioteca Supabase não foi carregada!');
    alert('Erro ao carregar aplicação. Por favor, recarregue a página.');
    throw new Error('Supabase library not loaded');
}

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configurações globais
const CONFIG = {
    MAX_QUESTOES_POR_TESTE: 100,
    TEMPO_ALERTA_QUESTAO: 300, // 5 minutos em segundos
};
