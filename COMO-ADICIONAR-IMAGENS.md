# 🖼️ Como Adicionar Imagens às Questões

## Visão Geral

O sistema suporta imagens em questões através de URLs externas. As imagens são exibidas **acima do texto da questão**, permitindo que o aluno visualize a imagem antes de ler o enunciado e responder.

---

## 📋 Serviços Gratuitos para Hospedar Imagens

### Opção 1: Imgur (Recomendado) ⭐
**Site:** https://imgur.com

**Vantagens:**
- Totalmente gratuito
- Não requer cadastro para uploads
- Links permanentes
- Muito popular e confiável

**Como usar:**
1. Acesse https://imgur.com
2. Clique em "New post" ou arraste a imagem
3. Após o upload, clique com botão direito na imagem
4. Escolha "Copy image address"
5. Você terá uma URL tipo: `https://i.imgur.com/abc123.jpg`

---

### Opção 2: ImgBB
**Site:** https://imgbb.com

**Vantagens:**
- Gratuito
- Interface simples
- Permite múltiplos uploads

**Como usar:**
1. Acesse https://imgbb.com
2. Clique em "Start uploading"
3. Selecione a imagem
4. Copie o "Direct link"

---

### Opção 3: Postimages
**Site:** https://postimages.org

**Vantagens:**
- Gratuito
- Sem necessidade de registro
- Várias opções de links

**Como usar:**
1. Acesse https://postimages.org
2. Selecione ou arraste a imagem
3. Após upload, copie o "Direct link"

---

### Opção 4: Google Drive (Para múltiplas imagens)
**Site:** https://drive.google.com

**Como usar:**
1. Faça upload da imagem no Google Drive
2. Clique direito > "Compartilhar"
3. Altere para "Qualquer pessoa com o link"
4. Copie o ID do arquivo da URL
5. Use o formato: `https://drive.google.com/uc?export=view&id=ID_DO_ARQUIVO`

**Exemplo:**
- Link original: `https://drive.google.com/file/d/1ABC123XYZ/view`
- Link para usar: `https://drive.google.com/uc?export=view&id=1ABC123XYZ`

---

## 🔧 Como Adicionar Imagens no Supabase

### Método 1: Via SQL Editor (Uma imagem)

```sql
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
    imagens_urls,  -- Coluna de imagens
    alternativas,
    gabarito,
    resolucao_comentada
) VALUES (
    'USP',
    'Residência Médica USP',
    2024,
    'Radiologia',
    'Diagnóstico por Imagem',
    'Clínica Médica',
    'Raio-X de Tórax',
    'Interpretação',
    'multipla_escolha',
    'Observe a radiografia de tórax abaixo. Qual o diagnóstico mais provável?',
    '{"https://i.imgur.com/exemplo123.jpg"}',  -- Uma imagem
    '[
        {"letra": "A", "texto": "Pneumonia"},
        {"letra": "B", "texto": "Derrame pleural"},
        {"letra": "C", "texto": "Pneumotórax"},
        {"letra": "D", "texto": "Atelectasia"},
        {"letra": "E", "texto": "Normal"}
    ]'::jsonb,
    'C',
    'A imagem mostra ausência de trama vascular à direita...'
);
```

---

### Método 2: Via SQL Editor (Múltiplas imagens)

```sql
INSERT INTO questoes (
    instituicao,
    processo_seletivo,
    ano,
    assunto,
    questao_texto,
    imagens_urls,  -- Array com múltiplas URLs
    tipo_questao,
    alternativas,
    gabarito,
    resolucao_comentada
    -- ... outros campos
) VALUES (
    'UNIFESP',
    'Residência Médica UNIFESP',
    2024,
    'Dermatologia',
    'Observe as lesões cutâneas nas imagens 1 e 2. Qual o diagnóstico?',
    '{
        "https://i.imgur.com/imagem1.jpg",
        "https://i.imgur.com/imagem2.jpg"
    }',  -- Duas imagens
    'multipla_escolha',
    '[
        {"letra": "A", "texto": "Psoríase"},
        {"letra": "B", "texto": "Eczema"},
        {"letra": "C", "texto": "Dermatite de contato"}
    ]'::jsonb,
    'A',
    'As lesões apresentam características típicas...'
);
```

---

### Método 3: Via Table Editor (Interface Visual)

1. No Supabase, vá em **Table Editor**
2. Selecione a tabela **questoes**
3. Clique em **Insert row** ou edite uma linha existente
4. No campo **imagens_urls**, insira:
   - Para uma imagem: `{"https://i.imgur.com/sua-imagem.jpg"}`
   - Para múltiplas: `{"https://i.imgur.com/img1.jpg", "https://i.imgur.com/img2.jpg"}`
5. Preencha os outros campos normalmente
6. Clique em **Save**

---

### Método 4: Atualizar Questão Existente

```sql
-- Adicionar imagem a uma questão que já existe
UPDATE questoes
SET imagens_urls = '{"https://i.imgur.com/abc123.jpg"}'
WHERE id = 'uuid-da-questao';

-- Adicionar múltiplas imagens
UPDATE questoes
SET imagens_urls = '{
    "https://i.imgur.com/img1.jpg",
    "https://i.imgur.com/img2.jpg",
    "https://i.imgur.com/img3.jpg"
}'
WHERE instituicao = 'USP' AND ano = 2024;
```

---

## 🎨 Como as Imagens Aparecem no Site

### Layout de Exibição:

```
┌─────────────────────────────────────┐
│  [Informações da Questão]           │
├─────────────────────────────────────┤
│                                     │
│  [IMAGEM 1]                         │
│  Imagem 1 de 2                      │
│                                     │
│  [IMAGEM 2]                         │
│  Imagem 2 de 2                      │
│                                     │
├─────────────────────────────────────┤
│  Texto da questão aqui...           │
├─────────────────────────────────────┤
│  ○ A) Alternativa 1                 │
│  ○ B) Alternativa 2                 │
│  ○ C) Alternativa 3                 │
└─────────────────────────────────────┘
```

### Funcionalidades das Imagens:

- ✅ **Clique para ampliar**: Clicar na imagem abre em nova aba (tela cheia)
- ✅ **Responsivas**: Ajustam automaticamente ao tamanho da tela
- ✅ **Múltiplas imagens**: Numeradas automaticamente
- ✅ **Tratamento de erros**: Se a URL estiver quebrada, mostra mensagem de erro

---

## ⚠️ Boas Práticas

### DO ✅

1. **Use serviços confiáveis**
   - Imgur, ImgBB, ou Postimages
   - Evite serviços temporários

2. **Otimize as imagens antes do upload**
   - Reduza o tamanho se muito grande
   - Use ferramentas como TinyPNG ou Squoosh
   - Imagens muito pesadas demoram para carregar

3. **Use URLs diretas**
   - O link deve terminar em `.jpg`, `.png`, `.jpeg`, ou `.gif`
   - Exemplo correto: `https://i.imgur.com/abc123.jpg`
   - Exemplo errado: `https://imgur.com/abc123` (página, não imagem)

4. **Teste a URL**
   - Cole a URL no navegador
   - Se abrir só a imagem, está correto
   - Se abrir uma página com a imagem, pegue o link direto

5. **Organize por especialidade**
   - Crie pastas/álbuns para cada especialidade
   - Facilita gerenciar depois

### DON'T ❌

1. **Não use links temporários**
   - Evite sites que deletam imagens após X dias

2. **Não use imagens com direitos autorais**
   - Use apenas imagens que você tem permissão
   - Ou imagens de domínio público/creative commons

3. **Não use imagens muito grandes**
   - Máximo recomendado: 2-3 MB por imagem
   - Ideal: 200-500 KB

4. **Não use URLs encurtadas**
   - Use sempre o link completo da imagem
   - Encurtadores podem expirar

---

## 🔍 Verificar se Imagens Estão Funcionando

### SQL para listar questões com imagens:

```sql
-- Ver todas as questões que têm imagens
SELECT
    id,
    instituicao,
    questao_texto,
    imagens_urls,
    array_length(imagens_urls, 1) as total_imagens
FROM questoes
WHERE imagens_urls IS NOT NULL
AND array_length(imagens_urls, 1) > 0
ORDER BY data_criacao DESC;
```

### SQL para encontrar questões sem imagens:

```sql
-- Ver questões SEM imagens
SELECT id, instituicao, questao_texto
FROM questoes
WHERE imagens_urls IS NULL
OR array_length(imagens_urls, 1) = 0;
```

---

## 🐛 Solução de Problemas

### Problema: Imagem não aparece

**Causas possíveis:**

1. **URL incorreta**
   - Verifique se o link está correto
   - Teste abrindo a URL em nova aba do navegador

2. **Link não é direto**
   - Certifique-se que termina em `.jpg`, `.png`, etc
   - Use "Copy image address" no Imgur

3. **Imagem foi deletada**
   - Recarregue a imagem no serviço
   - Atualize a URL no banco

4. **Serviço fora do ar**
   - Tente acessar a URL diretamente
   - Considere migrar para outro serviço

### Problema: Imagem muito lenta para carregar

**Solução:**
- Reduza o tamanho da imagem
- Comprima usando TinyPNG (https://tinypng.com)
- Ideal: imagens entre 100-500 KB

### Problema: Aparece mensagem "Erro ao carregar imagem"

**Solução:**
1. Abra o Console do navegador (F12)
2. Veja o erro específico
3. Geralmente é:
   - URL inválida
   - CORS bloqueado (use Imgur que permite)
   - Imagem deletada

---

## 📝 Exemplos Práticos

### Exemplo 1: Questão de ECG

```sql
INSERT INTO questoes (..., imagens_urls, ...) VALUES (
    ...,
    '{"https://i.imgur.com/ecg-exemplo.jpg"}',
    ...
);
```

### Exemplo 2: Questão com RX + Tomografia

```sql
INSERT INTO questoes (..., imagens_urls, ...) VALUES (
    ...,
    '{
        "https://i.imgur.com/rx-torax.jpg",
        "https://i.imgur.com/tomografia.jpg"
    }',
    ...
);
```

### Exemplo 3: Questão sem imagem

```sql
INSERT INTO questoes (..., imagens_urls, ...) VALUES (
    ...,
    '{}',  -- Array vazio = sem imagens
    ...
);
```

---

## 🔄 Migração de Banco Existente

Se você já criou o banco ANTES desta atualização, execute:

```sql
-- No SQL Editor do Supabase
ALTER TABLE questoes ADD COLUMN imagens_urls TEXT[] DEFAULT '{}';
```

Ou simplesmente execute o arquivo: `supabase/05-migration-add-images.sql`

---

## 💡 Dicas Finais

1. **Sempre teste a questão depois de adicionar**
   - Crie um teste com a questão
   - Verifique se a imagem carrega corretamente

2. **Mantenha backup dos links**
   - Guarde uma planilha com: ID da questão + URL da imagem
   - Facilita resubir se necessário

3. **Use nomes descritivos ao fazer upload**
   - Exemplo: "ecg-infarto-anterior-2024.jpg"
   - Facilita organização

4. **Considere criar conta nos serviços**
   - Imgur permite criar álbuns
   - Organiza melhor as imagens

---

Pronto! Agora você pode adicionar imagens às suas questões! 🎉

Para dúvidas, consulte o TROUBLESHOOTING.md ou verifique os logs do navegador (F12 > Console).
