# 📱 QR Codes por Mesa - Guia Completo

## 📋 Índice
- [O que são QR Codes por Mesa?](#o-que-são-qr-codes-por-mesa)
- [Como Gerar os QR Codes](#como-gerar-os-qr-codes)
- [Como Configurar](#como-configurar)
- [Como Imprimir](#como-imprimir)
- [Como Usar](#como-usar)
- [Solução de Problemas](#solução-de-problemas)

---

## 🎯 O que são QR Codes por Mesa?

Os QR Codes por Mesa permitem que seus clientes acessem o cardápio digital diretamente ao escanear um código impresso na mesa. O número da mesa é automaticamente identificado, facilitando o processo de pedido.

### Benefícios:
- ✅ Acesso rápido ao cardápio sem precisar digitar URL
- ✅ Identificação automática da mesa
- ✅ Experiência sem contato (contactless)
- ✅ Rastreamento de pedidos por mesa
- ✅ Redução de impressão de cardápios físicos

---

## 🚀 Como Gerar os QR Codes

### 1. Instalar Dependências

Primeiro, instale o pacote necessário:

\`\`\`bash
npm install qrcode
\`\`\`

### 2. Executar o Script

Use o comando abaixo para gerar os QR Codes:

\`\`\`bash
node scripts/generate-qrs.js --host https://seurestaurante.com --from 1 --to 20 --out ./qr-pngs --size 512
\`\`\`

### 3. Parâmetros Disponíveis

| Parâmetro | Descrição | Padrão | Exemplo |
|-----------|-----------|--------|---------|
| `--host` | URL do seu site | `http://localhost:8080` | `https://meurestaurante.com` |
| `--from` | Número da primeira mesa | `1` | `1` |
| `--to` | Número da última mesa | `20` | `30` |
| `--out` | Diretório de saída | `./qr-pngs` | `./qrcodes` |
| `--size` | Tamanho em pixels | `512` | `1024` |
| `--prefix` | Prefixo dos arquivos | `mesa-` | `table-` |
| `--utm` | Adicionar UTM tracking | `true` | `false` |

### 4. Exemplo Completo

Gerar QR Codes para 30 mesas com alta resolução:

\`\`\`bash
node scripts/generate-qrs.js \
  --host https://meurestaurante.com \
  --from 1 \
  --to 30 \
  --out ./qr-codes-mesas \
  --size 1024 \
  --prefix mesa-
\`\`\`

---

## ⚙️ Como Configurar

### 1. Variáveis de Ambiente

Adicione no arquivo `.env`:

\`\`\`env
# WhatsApp do Restaurante (com código do país, sem +)
VITE_RESTAURANT_WHATS_NUMBER=5511999998888

# Habilitar QR Codes por Mesa
VITE_RESTAURANT_ENABLE_TABLE_QR=true

# Número máximo de mesas (opcional)
VITE_RESTAURANT_MAX_TABLES=30
\`\`\`

### 2. Desabilitar QR Codes

Para desabilitar temporariamente os QR Codes por mesa:

\`\`\`env
VITE_RESTAURANT_ENABLE_TABLE_QR=false
\`\`\`

Quando desabilitado:
- O parâmetro `?mesa=XX` na URL será ignorado
- O campo "Mesa" não será preenchido automaticamente
- A badge "Você está na mesa X" não será exibida

---

## 🖨️ Como Imprimir

### Materiais Recomendados

1. **Papel Adesivo Fosco/Brilhante**
   - Tamanho: A4 (para múltiplos QR Codes)
   - Qualidade: 120g ou superior
   - Vantagem: Fácil de colar nas mesas

2. **Papel Fotográfico + Laminação**
   - Tamanho: 10x10cm ou 8x8cm
   - Proteção extra contra líquidos
   - Maior durabilidade

3. **Material Plástico (PVC/Acrílico)**
   - Mais durável
   - Resistente a água e sujeira
   - Ideal para uso intensivo

### Tamanhos Recomendados

| Local | Tamanho Mínimo | Tamanho Ideal |
|-------|----------------|---------------|
| Mesa pequena (2 pessoas) | 6x6cm | 8x8cm |
| Mesa média (4-6 pessoas) | 8x8cm | 10x10cm |
| Mesa grande (8+ pessoas) | 10x10cm | 12x12cm |

### Configurações de Impressão

1. **Resolução**: 300 DPI ou superior
2. **Cores**: Preto e branco (melhor legibilidade)
3. **Margens**: Mínimo 5mm ao redor do QR Code
4. **Escala**: 100% (não redimensionar)

### Passo a Passo

1. Abra os arquivos PNG gerados
2. Configure sua impressora para alta qualidade
3. Imprima um teste em papel comum primeiro
4. Escaneie para verificar se funciona
5. Se OK, imprima todos em material definitivo
6. Proteja com laminação ou plástico

---

## 📱 Como Usar

### Para os Clientes

1. Cliente se senta na mesa
2. Aponta a câmera do celular para o QR Code
3. Toca na notificação que aparecer
4. É direcionado automaticamente para o cardápio
5. O número da mesa já vem preenchido

### Fluxo do Pedido

\`\`\`
Cliente escaneia QR → 
Abre cardápio digital → 
Mesa identificada automaticamente → 
Cliente escolhe produtos → 
Finaliza pedido → 
Envia via WhatsApp → 
Restaurante recebe com número da mesa
\`\`\`

### Para o Restaurante

1. Cole os QR Codes nas mesas correspondentes
2. Teste cada QR Code após colar
3. Oriente os garçons sobre o funcionamento
4. Os pedidos chegarão pelo WhatsApp com identificação da mesa

---

## 🔧 Solução de Problemas

### QR Code não funciona

**Problema**: Cliente escaneia mas nada acontece

**Soluções**:
1. Verifique se a URL está correta no arquivo `.env`
2. Teste abrindo a URL manualmente: `https://seusite.com/menu?mesa=1`
3. Certifique-se que o site está no ar
4. Verifique se o QR Code não está danificado ou sujo

### Mesa não é identificada

**Problema**: Cliente acessa mas a mesa não aparece

**Soluções**:
1. Verifique se `VITE_RESTAURANT_ENABLE_TABLE_QR=true` no `.env`
2. Limpe o cache do navegador
3. Teste com o parâmetro `?mesa=1` manualmente na URL
4. Verifique o console do navegador por erros

### QR Code de baixa qualidade

**Problema**: QR Code pixelado ou difícil de escanear

**Soluções**:
1. Gere novamente com `--size 1024` ou maior
2. Use papel de melhor qualidade
3. Ajuste a impressora para alta qualidade
4. Não redimensione o QR Code após gerar

### Número errado da mesa

**Problema**: QR Code aponta para mesa errada

**Soluções**:
1. Verifique se colou o QR Code correto na mesa
2. Confira o nome do arquivo (mesa-01.png = Mesa 1)
3. Gere novamente os QR Codes se necessário

---

## 📊 Estatísticas e Tracking

### URLs com UTM

Por padrão, os QR Codes incluem parâmetros UTM:

\`\`\`
?mesa=1&utm_source=qr_mesa&utm_medium=qrcode&utm_campaign=mesa_01
\`\`\`

Isso permite rastrear:
- Quantos clientes escanearam cada mesa
- Quais mesas geram mais pedidos
- Horários de pico por mesa

### Como Visualizar

Use ferramentas como Google Analytics configuradas no seu site para visualizar essas métricas.

---

## 💡 Dicas Extras

### Manutenção

- ✅ Limpe os QR Codes regularmente
- ✅ Substitua QR Codes danificados imediatamente
- ✅ Tenha QR Codes extras de backup
- ✅ Revise os QR Codes mensalmente

### Localização

- 📍 Cole em local visível na mesa
- 📍 Evite locais onde possam molhar
- 📍 Proteja de luz solar direta (pode desbotar)
- 📍 Use suportes verticais se possível

### Marketing

- 📢 Adicione texto: "Escaneie para ver o cardápio"
- 🎨 Personalize com cores/logo do restaurante
- 📝 Inclua instruções simples se necessário
- 🌟 Destaque benefícios (sem contato, rápido, fácil)

---

## 📞 Suporte

Problemas ou dúvidas?

1. Verifique este guia primeiro
2. Consulte a documentação técnica
3. Entre em contato com o suporte técnico

---

## 📝 Checklist Final

Antes de implementar no restaurante:

- [ ] QR Codes gerados com URL correta
- [ ] Variáveis de ambiente configuradas
- [ ] QR Codes testados com celular
- [ ] Material de impressão escolhido
- [ ] QR Codes impressos e protegidos
- [ ] Equipe treinada sobre o funcionamento
- [ ] Teste completo do fluxo de pedido
- [ ] QR Codes extras de backup preparados

---

**Criado por:** seucardapiodigital  
**Última atualização:** 2024

🎉 **Bom proveito com seus QR Codes!**
