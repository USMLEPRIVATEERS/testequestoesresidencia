// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================

// IMPORTANTE: Substitua estas variáveis com as suas credenciais do Supabase
// Você encontra essas informações em: Project Settings > API

const SUPABASE_URL = 'https://fdzgjicbasjprqunpsjk.supabase.co'; // Ex: https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkemdqaWNiYXNqcHJxdW5wc2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDgyMDQsImV4cCI6MjA4MjQyNDIwNH0.SQy1MA4iKPzsWay2l1HaA15MYQduuLhARiHtIyEBS5Q';

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
