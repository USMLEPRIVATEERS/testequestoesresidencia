-- ============================================
-- DADOS DE EXEMPLO PARA TESTE
-- ============================================
-- Este arquivo contém dados de exemplo para você testar o sistema
-- Execute apenas se quiser popular o banco com dados de teste

-- Inserir questões de exemplo
INSERT INTO questoes (
    instituicao,
    processo_seletivo,
    ano,
    assunto,
    sistema,
    categoria,
    topico,
    subtopico,
    tipo_questao,
    questao_texto,
    imagens_urls,
    alternativas,
    gabarito,
    resolucao_comentada
) VALUES
(
    'USP',
    'Residência Médica USP',
    2024,
    'Cardiologia',
    'Cardiovascular',
    'Clínica Médica',
    'Insuficiência Cardíaca',
    'Diagnóstico',
    'multipla_escolha',
    'Paciente de 65 anos, portador de insuficiência cardíaca classe funcional III (NYHA), apresenta dispneia aos mínimos esforços. Qual o melhor exame para avaliar a fração de ejeção?',
    '{}', -- Sem imagens nesta questão
    '[
        {"letra": "A", "texto": "Radiografia de tórax"},
        {"letra": "B", "texto": "Ecocardiograma transtorácico"},
        {"letra": "C", "texto": "Eletrocardiograma"},
        {"letra": "D", "texto": "Teste ergométrico"},
        {"letra": "E", "texto": "Holter 24 horas"}
    ]'::jsonb,
    'B',
    'O ecocardiograma transtorácico é o exame padrão-ouro para avaliação da fração de ejeção ventricular esquerda, sendo não invasivo, amplamente disponível e fornecendo informações estruturais e funcionais detalhadas do coração.'
),
(
    'UNIFESP',
    'Residência Médica UNIFESP',
    2024,
    'Neurologia',
    'Nervoso',
    'Clínica Médica',
    'AVC',
    'Tratamento Agudo',
    'multipla_escolha',
    'Em relação ao tratamento do AVC isquêmico agudo, a trombólise com alteplase está indicada em até quantas horas do início dos sintomas?',
    '{}', -- Sem imagens nesta questão
    '[
        {"letra": "A", "texto": "3 horas"},
        {"letra": "B", "texto": "4,5 horas"},
        {"letra": "C", "texto": "6 horas"},
        {"letra": "D", "texto": "12 horas"},
        {"letra": "E", "texto": "24 horas"}
    ]'::jsonb,
    'B',
    'A janela terapêutica para trombólise com alteplase no AVC isquêmico agudo é de até 4,5 horas. Estudos demonstraram benefício significativo quando administrado nesse período, com redução de incapacidade funcional.'
),
(
    'HC-FMUSP',
    'Residência Médica HC',
    2023,
    'Pneumologia',
    'Respiratório',
    'Clínica Médica',
    'Asma',
    'Classificação',
    'multipla_escolha',
    'Paciente com asma que apresenta sintomas diurnos mais de 2 vezes por semana, mas não diariamente, e despertares noturnos 3-4 vezes por mês. Como classificar essa asma segundo GINA?',
    '{}', -- Sem imagens nesta questão
    '[
        {"letra": "A", "texto": "Intermitente"},
        {"letra": "B", "texto": "Persistente leve"},
        {"letra": "C", "texto": "Persistente moderada"},
        {"letra": "D", "texto": "Persistente grave"},
        {"letra": "E", "texto": "Não controlada"}
    ]'::jsonb,
    'B',
    'Segundo o GINA (Global Initiative for Asthma), asma persistente leve é caracterizada por sintomas diurnos mais de 2 vezes por semana (mas não diariamente) e/ou despertares noturnos 3-4 vezes por mês.'
),
(
    'USP',
    'Residência Médica USP',
    2023,
    'Gastroenterologia',
    'Digestório',
    'Clínica Médica',
    'Doença do Refluxo',
    'Diagnóstico',
    'multipla_escolha',
    'Qual o exame padrão-ouro para diagnóstico de esofagite erosiva na doença do refluxo gastroesofágico?',
    '{}', -- Sem imagens nesta questão
    '[
        {"letra": "A", "texto": "pHmetria esofágica 24h"},
        {"letra": "B", "texto": "Endoscopia digestiva alta"},
        {"letra": "C", "texto": "Radiografia contrastada de esôfago"},
        {"letra": "D", "texto": "Manometria esofágica"},
        {"letra": "E", "texto": "Cintilografia esofágica"}
    ]'::jsonb,
    'B',
    'A endoscopia digestiva alta (EDA) é o exame padrão-ouro para diagnóstico de esofagite erosiva, permitindo visualização direta da mucosa esofágica, graduação das lesões e realização de biópsias quando necessário.'
),
(
    'UNIFESP',
    'Residência Médica UNIFESP',
    2023,
    'Nefrologia',
    'Urinário',
    'Clínica Médica',
    'Insuficiência Renal Aguda',
    'Classificação',
    'multipla_escolha',
    'Na classificação KDIGO da injúria renal aguda, qual o critério de Estágio 1?',
    '{}', -- Sem imagens nesta questão
    '[
        {"letra": "A", "texto": "Aumento da creatinina ≥0,3 mg/dL em 48h ou 1,5-1,9x o valor basal"},
        {"letra": "B", "texto": "Aumento da creatinina 2-2,9x o valor basal"},
        {"letra": "C", "texto": "Aumento da creatinina ≥3x o valor basal"},
        {"letra": "D", "texto": "Débito urinário <0,5 mL/kg/h por 12 horas"},
        {"letra": "E", "texto": "Necessidade de diálise"}
    ]'::jsonb,
    'A',
    'Segundo o KDIGO (Kidney Disease: Improving Global Outcomes), o Estágio 1 da IRA é definido por aumento da creatinina sérica ≥0,3 mg/dL em 48 horas OU aumento para 1,5-1,9 vezes o valor basal OU débito urinário <0,5 mL/kg/h por 6-12 horas.'
),
(
    'USP',
    'Residência Médica USP',
    2024,
    'Infectologia',
    'Infectoparasitário',
    'Clínica Médica',
    'Dengue',
    'Diagnóstico Clínico',
    'multipla_escolha',
    'Paciente de 32 anos apresenta febre há 3 dias, cefaleia retroorbitária, mialgia intensa e exantema maculopapular. Hemograma mostra plaquetopenia (120.000/mm³) e hematócrito normal. Qual a classificação da dengue?',
    '{}',
    '[
        {"letra": "A", "texto": "Dengue sem sinais de alarme"},
        {"letra": "B", "texto": "Dengue com sinais de alarme"},
        {"letra": "C", "texto": "Dengue grave"},
        {"letra": "D", "texto": "Febre hemorrágica da dengue"},
        {"letra": "E", "texto": "Síndrome do choque da dengue"}
    ]'::jsonb,
    'A',
    'Segundo a classificação da OMS 2009, paciente com manifestações clínicas típicas (febre, cefaleia retroorbitária, mialgia) e plaquetopenia leve sem sinais de alarme (dor abdominal intensa, vômitos persistentes, sangramento importante, etc) é classificado como dengue sem sinais de alarme.'
),
(
    'UNIFESP',
    'Residência Médica UNIFESP',
    2023,
    'Endocrinologia',
    'Endócrino',
    'Clínica Médica',
    'Diabetes Mellitus',
    'Diagnóstico',
    'multipla_escolha',
    'Paciente assintomático realiza exames de rotina. Glicemia de jejum: 118 mg/dL. Hemoglobina glicada: 6,2%. Como proceder?',
    '{}',
    '[
        {"letra": "A", "texto": "Diagnóstico de diabetes, iniciar metformina"},
        {"letra": "B", "texto": "Pré-diabetes, repetir exames em 1 ano"},
        {"letra": "C", "texto": "Pré-diabetes, iniciar metformina imediatamente"},
        {"letra": "D", "texto": "Solicitar teste oral de tolerância à glicose"},
        {"letra": "E", "texto": "Normal, repetir em 3 anos"}
    ]'::jsonb,
    'D',
    'Glicemia de jejum entre 100-125 mg/dL e HbA1c entre 5,7-6,4% caracterizam pré-diabetes. Para confirmar diagnóstico de diabetes em paciente assintomático, é necessário realizar teste oral de tolerância à glicose (TOTG) ou repetir exame alterado em outra ocasião.'
),
(
    'HC-FMUSP',
    'Residência Médica HC',
    2024,
    'Reumatologia',
    'Musculoesquelético',
    'Clínica Médica',
    'Artrite Reumatoide',
    'Critérios Diagnósticos',
    'multipla_escolha',
    'Mulher de 45 anos com poliartrite simétrica de pequenas articulações das mãos há 8 semanas, rigidez matinal > 1 hora. Fator reumatoide e anti-CCP positivos. Qual o diagnóstico mais provável?',
    '{}',
    '[
        {"letra": "A", "texto": "Osteoartrite"},
        {"letra": "B", "texto": "Artrite reumatoide"},
        {"letra": "C", "texto": "Lúpus eritematoso sistêmico"},
        {"letra": "D", "texto": "Artrite psoriásica"},
        {"letra": "E", "texto": "Febre reumática"}
    ]'::jsonb,
    'B',
    'Quadro clássico de artrite reumatoide: poliartrite simétrica de pequenas articulações, rigidez matinal prolongada (>1h), FR e anti-CCP positivos. O anti-CCP é altamente específico para AR (>95%).'
),
(
    'USP',
    'Residência Médica USP',
    2023,
    'Hematologia',
    'Hematopoiético',
    'Clínica Médica',
    'Anemia Ferropriva',
    'Diagnóstico Laboratorial',
    'multipla_escolha',
    'Paciente com anemia microcítica e hipocrômica. Qual o melhor exame inicial para confirmar anemia ferropriva?',
    '{}',
    '[
        {"letra": "A", "texto": "Dosagem de ferro sérico"},
        {"letra": "B", "texto": "Dosagem de ferritina"},
        {"letra": "C", "texto": "Capacidade total de ligação do ferro"},
        {"letra": "D", "texto": "Saturação de transferrina"},
        {"letra": "E", "texto": "Eletroforese de hemoglobina"}
    ]'::jsonb,
    'B',
    'A ferritina é o melhor exame inicial para avaliar estoques de ferro, sendo o primeiro a se alterar na deficiência de ferro. Valores <30 ng/mL confirmam anemia ferropriva. É mais específico que ferro sérico isolado.'
),
(
    'UNIFESP',
    'Residência Médica UNIFESP',
    2024,
    'Oncologia',
    'Neoplasias',
    'Clínica Médica',
    'Câncer de Pulmão',
    'Rastreamento',
    'multipla_escolha',
    'Qual grupo tem indicação de rastreamento de câncer de pulmão com tomografia de baixa dose segundo diretrizes atuais?',
    '{}',
    '[
        {"letra": "A", "texto": "Todos acima de 50 anos"},
        {"letra": "B", "texto": "Tabagistas com >20 maços-ano, 50-80 anos"},
        {"letra": "C", "texto": "Ex-tabagistas há mais de 20 anos"},
        {"letra": "D", "texto": "Apenas sintomáticos respiratórios"},
        {"letra": "E", "texto": "História familiar de câncer de pulmão"}
    ]'::jsonb,
    'B',
    'Segundo USPSTF e diretrizes internacionais, rastreamento com TC de baixa dose está indicado para adultos de 50-80 anos com história de tabagismo ≥20 maços-ano que fumam atualmente ou pararam há <15 anos.'
),
(
    'HC-FMUSP',
    'Residência Médica HC',
    2023,
    'Gastroenterologia',
    'Digestório',
    'Cirurgia Geral',
    'Apendicite Aguda',
    'Diagnóstico Clínico',
    'multipla_escolha',
    'Qual o sinal clínico mais específico para apendicite aguda?',
    '{}',
    '[
        {"letra": "A", "texto": "Sinal de Blumberg (descompressão brusca)"},
        {"letra": "B", "texto": "Sinal de McBurney (dor no ponto)"},
        {"letra": "C", "texto": "Sinal de Rovsing (dor à palpação do QIE)"},
        {"letra": "D", "texto": "Sinal do psoas"},
        {"letra": "E", "texto": "Febre"}
    ]'::jsonb,
    'A',
    'O sinal de Blumberg (dor à descompressão brusca) indica irritação peritoneal e é o mais específico para apendicite, embora o sinal de McBurney seja mais sensível. Blumberg positivo sugere peritonite localizada.'
),
(
    'USP',
    'Residência Médica USP',
    2024,
    'Ginecologia',
    'Reprodutor Feminino',
    'Ginecologia e Obstetrícia',
    'Síndrome dos Ovários Policísticos',
    'Critérios Diagnósticos',
    'multipla_escolha',
    'Segundo critérios de Rotterdam, quantos critérios são necessários para diagnóstico de SOP?',
    '{}',
    '[
        {"letra": "A", "texto": "1 de 3 (oligo-anovulação, hiperandrogenismo, ovários policísticos)"},
        {"letra": "B", "texto": "2 de 3 (oligo-anovulação, hiperandrogenismo, ovários policísticos)"},
        {"letra": "C", "texto": "3 de 3 (oligo-anovulação, hiperandrogenismo, ovários policísticos)"},
        {"letra": "D", "texto": "Apenas hiperandrogenismo"},
        {"letra": "E", "texto": "Apenas ovários policísticos ao ultrassom"}
    ]'::jsonb,
    'B',
    'Pelos critérios de Rotterdam (2003), são necessários 2 de 3 critérios: 1) oligo ou anovulação, 2) hiperandrogenismo clínico ou laboratorial, 3) ovários policísticos ao ultrassom. Deve-se excluir outras causas de hiperandrogenismo.'
),
(
    'UNIFESP',
    'Residência Médica UNIFESP',
    2023,
    'Pediatria',
    'Pediátrico',
    'Pediatria',
    'Calendário Vacinal',
    'Vacinação',
    'multipla_escolha',
    'A vacina tríplice viral (SCR) deve ser aplicada em qual idade no calendário vacinal brasileiro?',
    '{}',
    '[
        {"letra": "A", "texto": "Ao nascer"},
        {"letra": "B", "texto": "2 meses"},
        {"letra": "C", "texto": "6 meses"},
        {"letra": "D", "texto": "12 meses"},
        {"letra": "E", "texto": "4 anos"}
    ]'::jsonb,
    'D',
    'A tríplice viral (sarampo, caxumba, rubéola) é aplicada aos 12 meses (1ª dose) e 15 meses (2ª dose com tetra viral - SCR + varicela). Antes de 12 meses, anticorpos maternos podem interferir na resposta vacinal.'
),
(
    'HC-FMUSP',
    'Residência Médica HC',
    2024,
    'Psiquiatria',
    'Nervoso',
    'Psiquiatria',
    'Transtorno Depressivo Maior',
    'Tratamento',
    'multipla_escolha',
    'Qual o tempo mínimo recomendado de tratamento antidepressivo após remissão do primeiro episódio de depressão maior?',
    '{}',
    '[
        {"letra": "A", "texto": "1 mês"},
        {"letra": "B", "texto": "3 meses"},
        {"letra": "C", "texto": "6-12 meses"},
        {"letra": "D", "texto": "2 anos"},
        {"letra": "E", "texto": "Uso indefinido"}
    ]'::jsonb,
    'C',
    'Após remissão do primeiro episódio depressivo, recomenda-se manter tratamento por 6-12 meses para prevenir recaída. Em casos de episódios recorrentes ou graves, pode-se considerar manutenção mais prolongada.'
),
(
    'USP',
    'Residência Médica USP',
    2023,
    'Nefrologia',
    'Urinário',
    'Clínica Médica',
    'Doença Renal Crônica',
    'Estadiamento',
    'multipla_escolha',
    'Paciente com TFG de 35 mL/min/1,73m². Em qual estágio da DRC se encontra?',
    '{}',
    '[
        {"letra": "A", "texto": "Estágio 1 - lesão renal com TFG normal"},
        {"letra": "B", "texto": "Estágio 2 - lesão renal com TFG levemente reduzida"},
        {"letra": "C", "texto": "Estágio 3a - TFG moderadamente reduzida"},
        {"letra": "D", "texto": "Estágio 3b - TFG moderadamente a gravemente reduzida"},
        {"letra": "E", "texto": "Estágio 4 - TFG gravemente reduzida"}
    ]'::jsonb,
    'D',
    'Segundo KDOQI: Estágio 1 (TFG ≥90), Estágio 2 (60-89), Estágio 3a (45-59), Estágio 3b (30-44), Estágio 4 (15-29), Estágio 5 (<15 ou diálise). TFG de 35 = Estágio 3b.'
);

-- TOTAL: 15 questões de exemplo
-- Cobrindo diversas especialidades médicas para teste do sistema
