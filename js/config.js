// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================

// IMPORTANTE: Substitua estas variáveis com as suas credenciais do Supabase
// Você encontra essas informações em: Project Settings > API

const SUPABASE_URL = 'https://fdzgjicbasjprqunpsjk.supabase.co'; // Ex: https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkemdqaWNiYXNqcHJxdW5wc2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDgyMDQsImV4cCI6MjA4MjQyNDIwNH0.SQy1MA4iKPzsWay2l1HaA15MYQduuLhARiHtIyEBS5Q';

// Configuração de ambiente (mude para false em produção)
const IS_DEVELOPMENT = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('github.dev');

// Sistema de logging condicional para performance
const Logger = {
    log: IS_DEVELOPMENT ? console.log.bind(console) : () => {},
    warn: IS_DEVELOPMENT ? console.warn.bind(console) : () => {},
    error: console.error.bind(console), // Sempre loga erros
    debug: IS_DEVELOPMENT ? console.log.bind(console) : () => {},
    info: IS_DEVELOPMENT ? console.info.bind(console) : () => {}
};

// Inicializar cliente Supabase
if (!window.supabase) {
    console.error('Erro: Biblioteca Supabase não foi carregada!');
    console.warn('Aguardando carregamento da biblioteca Supabase...');
    // Não mostrar alert - deixar a página carregar normalmente
    // Se houver erro, será tratado nas funções que usam o supabaseClient
}

const { createClient } = window.supabase || {};
const supabaseClient = window.supabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Configurações globais
const CONFIG = {
    MAX_QUESTOES_POR_TESTE: 100,
    TEMPO_ALERTA_QUESTAO: 300, // 5 minutos em segundos
};
