# 🚀 Guia de Implementação - WhatsApp + QR Codes

## 📋 Índice
1. [Configuração Inicial](#configuração-inicial)
2. [Envio via WhatsApp](#envio-via-whatsapp)
3. [QR Codes por Mesa](#qr-codes-por-mesa)
4. [Checkout](#checkout)
5. [Testes](#testes)

---

## ⚙️ Configuração Inicial

### 1. Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione:

```env
# WhatsApp do Restaurante (com código do país, sem +)
VITE_RESTAURANT_WHATS_NUMBER=5511999998888

# Habilitar QR Codes por Mesa
VITE_RESTAURANT_ENABLE_TABLE_QR=true

# Número máximo de mesas
VITE_RESTAURANT_MAX_TABLES=30
```

### 2. Instalar Dependências

```bash
npm install
```

O pacote `qrcode` já foi adicionado automaticamente.

---

## 📱 Envio via WhatsApp

### Como Funciona

1. Cliente adiciona itens ao carrinho
2. Clica em "Carrinho" e vai para página de checkout
3. Preenche nome/mesa e observações
4. Clica em "Enviar Pedido por WhatsApp"
5. Sistema monta mensagem formatada
6. Abre WhatsApp com a mensagem pronta
7. Cliente confirma e envia

### Formato da Mensagem

```
🍽️ *Pedido - João (Mesa 5)*
━━━━━━━━━━━━━━━━━━━━━━━

*2x Estrogonofe de Frango*
   R$ 32,00 cada
   Subtotal: R$ 64,00

*1x Pastel de carne*
   R$ 8,50 cada
   Subtotal: R$ 8,50

━━━━━━━━━━━━━━━━━━━━━━━
*Subtotal:* R$ 72,50
*Total:* R$ 72,50
━━━━━━━━━━━━━━━━━━━━━━━

🏪 *Retirada no local*

📝 *Observações:*
Sem cebola, trocar por salada

_Enviado via Cardápio Digital_ 🚀
```

### Funções Disponíveis

O arquivo `src/utils/whatsapp.ts` exporta:

```typescript
// Enviar pedido via WhatsApp
sendOrderViaWhatsApp(order, customerName, table?, options?)

// Verificar se WhatsApp está configurado
isWhatsAppConfigured(phone?)
```

---

## 🎯 QR Codes por Mesa

### Geração de QR Codes

#### Opção 1: Via NPM Script

```bash
# Gerar QR Codes para 20 mesas
npm run gen:qrs

# Com parâmetros personalizados
npm run gen:qrs -- --host https://meurestaurante.com --to 30
```

#### Opção 2: Comando Direto

```bash
node scripts/generate-qrs.js \
  --host https://meurestaurante.com \
  --from 1 \
  --to 30 \
  --out ./qr-codes \
  --size 1024
```

### Parâmetros

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `--host` | URL do restaurante | `http://localhost:8080` |
| `--from` | Mesa inicial | `1` |
| `--to` | Mesa final | `20` |
| `--out` | Diretório de saída | `./qr-pngs` |
| `--size` | Tamanho em pixels | `512` |
| `--prefix` | Prefixo dos arquivos | `mesa-` |

### Como Usar os QR Codes

1. **Gerar os arquivos PNG**
   ```bash
   npm run gen:qrs -- --host https://seusite.com --to 25
   ```

2. **Arquivos gerados**
   - `qr-pngs/mesa-01.png` → Mesa 1
   - `qr-pngs/mesa-02.png` → Mesa 2
   - ... e assim por diante

3. **Imprimir**
   - Use papel adesivo ou fotográfico
   - Tamanho recomendado: 8x8cm
   - Proteja com laminação

4. **Colar nas mesas**
   - Cole cada QR na mesa correspondente
   - Teste escaneando antes

5. **Cliente escaneia**
   - Abre cardápio automaticamente
   - Mesa já vem preenchida

### URL Gerada

```
https://seurestaurante.com/menu?mesa=5&utm_source=qr_mesa&utm_medium=qrcode&utm_campaign=mesa_05
```

---

## 🛒 Checkout

### Fluxo Completo

1. **Menu** (`/menu/:restaurantId`)
   - Cliente adiciona produtos ao carrinho
   - Clica no botão "Carrinho"

2. **Checkout** (`/checkout/:restaurantId`)
   - Exibe resumo do pedido
   - Formulário com:
     - Nome/Mesa (preenchido se vindo de QR)
     - Observações
     - Tipo de pedido (retirada/entrega)
     - Endereço de entrega (se delivery)
   - Toggle "Salvar no histórico"
   - Botão "Enviar por WhatsApp"

3. **WhatsApp**
   - Abre com mensagem pronta
   - Cliente confirma e envia
   - Restaurante recebe no WhatsApp

### Componentes Criados

```
src/
├── pages/
│   └── OrderCheckout.tsx       # Página de checkout
├── utils/
│   └── whatsapp.ts             # Utilitário WhatsApp
└── contexts/
    └── CartContext.tsx         # Já existia
```

---

## 🧪 Testes

### 1. Teste Manual Básico

```bash
# 1. Rodar o projeto
npm run dev

# 2. Acessar
http://localhost:8080/menu/:restaurantId

# 3. Testar fluxo
- Adicionar produtos ao carrinho
- Clicar em "Carrinho"
- Preencher dados
- Clicar em "Enviar por WhatsApp"
- Verificar se abre WhatsApp com mensagem
```

### 2. Teste com QR Code

```bash
# 1. Gerar QR de teste
npm run gen:qrs -- --host http://localhost:8080 --to 5

# 2. Escanear QR Code da mesa 1
# Ou acessar diretamente:
http://localhost:8080/menu/:restaurantId?mesa=1

# 3. Verificar se:
- Badge "Você está na Mesa 1" aparece
- Campo nome vem preenchido com "Mesa 1"
```

### 3. Teste de Configuração

```bash
# Testar com QR desabilitado
VITE_RESTAURANT_ENABLE_TABLE_QR=false npm run dev
# → Badge não deve aparecer
# → ?mesa= deve ser ignorado

# Testar sem WhatsApp configurado
# Remover VITE_RESTAURANT_WHATS_NUMBER do .env
# → Deve mostrar erro ao tentar enviar
```

---

## ✅ Checklist de Implementação

### Configuração
- [ ] Arquivo `.env` configurado
- [ ] `VITE_RESTAURANT_WHATS_NUMBER` preenchido
- [ ] `VITE_RESTAURANT_ENABLE_TABLE_QR=true`
- [ ] Dependências instaladas (`npm install`)

### QR Codes
- [ ] Script de geração executado
- [ ] Arquivos PNG gerados
- [ ] QR Codes testados com celular
- [ ] QR Codes impressos
- [ ] QR Codes colados nas mesas

### Testes
- [ ] Fluxo completo testado (menu → checkout → WhatsApp)
- [ ] QR Code abrindo corretamente
- [ ] Mesa sendo identificada
- [ ] Mensagem WhatsApp formatada corretamente
- [ ] Salvar no histórico funcionando

### Deploy
- [ ] Variáveis de ambiente configuradas no servidor
- [ ] Build realizado sem erros
- [ ] Testes em produção
- [ ] Equipe treinada

---

## 🚨 Solução de Problemas

### WhatsApp não abre

**Problema**: Botão não faz nada

**Soluções**:
1. Verifique se `VITE_RESTAURANT_WHATS_NUMBER` está configurado
2. Verifique o formato: `5511999998888` (sem + e espaços)
3. Abra o console do navegador e veja erros
4. Teste se popup não foi bloqueado

### Mesa não é identificada

**Problema**: QR Code abre mas mesa não aparece

**Soluções**:
1. Verifique se `VITE_RESTAURANT_ENABLE_TABLE_QR=true`
2. Teste a URL manualmente: `...?mesa=1`
3. Limpe cache do navegador
4. Verifique console por erros

### QR Code não funciona

**Problema**: QR Code não escaneia

**Soluções**:
1. Gere com tamanho maior: `--size 1024`
2. Use papel de melhor qualidade
3. Verifique se URL está correta
4. Teste com diferentes apps de câmera

---

## 📚 Documentação Adicional

- **QR Codes Detalhado**: Ver `README.qr.md`
- **API WhatsApp**: Ver `src/utils/whatsapp.ts`
- **Componentes**: Ver código-fonte dos componentes

---

## 🎯 Próximos Passos

1. ✅ Implementação básica concluída
2. 🔄 Testes em produção
3. 📊 Configurar analytics (opcional)
4. 🔔 Adicionar notificações de pedido (opcional)
5. 💳 Integrar pagamento online (opcional)

---

**Criado por**: seucardapiodigital  
**Data**: 2024  
**Versão**: 1.0.0

🎉 **Parabéns! Sistema de WhatsApp + QR Codes implementado com sucesso!**
