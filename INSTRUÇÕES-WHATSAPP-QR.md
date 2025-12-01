# 🚀 GUIA RÁPIDO - WhatsApp + QR Codes

## ✅ O que foi implementado

### 1. Envio via WhatsApp
- ✅ Função `sendOrderViaWhatsApp()` em `src/utils/whatsapp.ts`
- ✅ Mensagem formatada em português com emojis
- ✅ Suporte a opções de produto e observações
- ✅ Cálculo automático de totais
- ✅ Detecção mobile/desktop para abrir WhatsApp correto

### 2. Página de Checkout
- ✅ Nova página `OrderCheckout.tsx` em `/checkout/:restaurantId`
- ✅ Formulário com nome, mesa, observações
- ✅ Resumo completo do carrinho
- ✅ Suporte a delivery com zonas
- ✅ Toggle para salvar no histórico
- ✅ Integração com WhatsApp

### 3. QR Codes por Mesa
- ✅ Script gerador em `scripts/generate-qrs.js`
- ✅ Gera PNGs com URLs personalizadas
- ✅ Suporte a parâmetro `?mesa=XX` na URL
- ✅ Badge visual mostrando mesa atual
- ✅ Auto-preenchimento do campo mesa
- ✅ Toggle para habilitar/desabilitar

### 4. Documentação
- ✅ `.env.example` com variáveis necessárias
- ✅ `README.qr.md` - guia detalhado de QR Codes
- ✅ `README.whatsapp-qr.md` - guia completo de implementação
- ✅ Este arquivo de instruções rápidas

---

## 🏃 INÍCIO RÁPIDO (5 minutos)

### Passo 1: Configurar Variáveis de Ambiente

```bash
# Edite o arquivo .env e adicione:
VITE_RESTAURANT_WHATS_NUMBER=5511999998888
VITE_RESTAURANT_ENABLE_TABLE_QR=true
```

### Passo 2: Instalar Dependências (se ainda não fez)

```bash
npm install
```

### Passo 3: Testar o Sistema

```bash
npm run dev
```

Acesse: `http://localhost:8080/menu/:restaurantId`

1. Adicione produtos ao carrinho
2. Clique em "Carrinho"
3. Preencha os dados
4. Clique em "Enviar por WhatsApp"
5. ✅ Deve abrir WhatsApp com a mensagem!

### Passo 4: Gerar QR Codes (Opcional)

```bash
node scripts/generate-qrs.js --host https://seurestaurante.com --to 20
```

Os arquivos PNG serão salvos em `./qr-pngs/`

---

## 📱 COMO USAR

### Para Clientes

**Opção 1: Acesso direto via QR Code**
1. Escaneia QR Code na mesa
2. Abre cardápio automaticamente
3. Mesa já identificada

**Opção 2: Acesso manual**
1. Acessa URL do cardápio
2. Adiciona produtos
3. Vai para checkout
4. Preenche dados manualmente

**Ambas opções:**
1. Clica em "Enviar por WhatsApp"
2. Confirma no WhatsApp
3. ✅ Pedido enviado!

### Para Restaurante

1. **Receber pedidos**: Chegam via WhatsApp formatados
2. **Gerar QR Codes**: Usar script quando necessário
3. **Configurar**: Habilitar/desabilitar QR via `.env`

---

## 🎯 EXEMPLO DE PEDIDO NO WHATSAPP

```
🍽️ *Pedido - João (Mesa 5)*
━━━━━━━━━━━━━━━━━━━━━━━

*2x Estrogonofe de Frango*
   R$ 32,00 cada
   _Tamanho: Médio_
      • Arroz Branco
   Subtotal: R$ 64,00

*1x Pastel de carne*
   R$ 8,50 cada
   📝 _Sem cebola_
   Subtotal: R$ 8,50

━━━━━━━━━━━━━━━━━━━━━━━
*Subtotal:* R$ 72,50
*Total:* R$ 72,50
━━━━━━━━━━━━━━━━━━━━━━━

🏪 *Retirada no local*

📝 *Observações:*
Trocar por salada

_Enviado via Cardápio Digital_ 🚀
```

---

## 🔧 COMANDOS ÚTEIS

### Desenvolvimento

```bash
# Rodar projeto
npm run dev

# Build para produção
npm run build
```

### QR Codes

```bash
# Gerar QR Codes (básico)
node scripts/generate-qrs.js --host https://seusite.com

# Gerar com mais opções
node scripts/generate-qrs.js \
  --host https://seusite.com \
  --from 1 \
  --to 30 \
  --out ./qr-codes \
  --size 1024
```

### Testes

```bash
# Testar com mesa específica
http://localhost:8080/menu/:restaurantId?mesa=5

# Testar sem QR habilitado
VITE_RESTAURANT_ENABLE_TABLE_QR=false npm run dev
```

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Novos Arquivos

```
src/
├── utils/
│   └── whatsapp.ts                    # Função de envio WhatsApp
├── pages/
│   └── OrderCheckout.tsx              # Página de checkout
scripts/
└── generate-qrs.js                    # Gerador de QR Codes
.env.example                           # Exemplo de configuração
README.qr.md                           # Guia detalhado QR
README.whatsapp-qr.md                  # Guia completo
INSTRUÇÕES-WHATSAPP-QR.md             # Este arquivo
```

### Arquivos Modificados

```
src/
├── App.tsx                            # Adicionada rota /checkout
├── pages/
│   └── Menu.tsx                       # Badge de mesa, redirect para checkout
```

---

## ⚙️ VARIÁVEIS DE AMBIENTE

### Obrigatórias

```env
# WhatsApp do restaurante (com código país, sem +)
VITE_RESTAURANT_WHATS_NUMBER=5511999998888
```

### Opcionais

```env
# Habilitar QR Codes por mesa (padrão: false)
VITE_RESTAURANT_ENABLE_TABLE_QR=true

# Número máximo de mesas (informativo)
VITE_RESTAURANT_MAX_TABLES=30
```

---

## 🧪 CHECKLIST DE TESTES

Antes de colocar em produção:

- [ ] `.env` configurado com WhatsApp correto
- [ ] Fluxo completo testado (menu → checkout → WhatsApp)
- [ ] Mensagem WhatsApp formatada corretamente
- [ ] QR Codes gerados e testados (se usar)
- [ ] Mesa sendo identificada corretamente (se usar QR)
- [ ] Badge "Você está na Mesa X" aparecendo (se usar QR)
- [ ] Delivery funcionando se habilitado
- [ ] Salvar no histórico funcionando
- [ ] Testado em mobile e desktop
- [ ] Testado em diferentes navegadores

---

## 🚨 PROBLEMAS COMUNS

### WhatsApp não abre
- ✅ Verifique `VITE_RESTAURANT_WHATS_NUMBER` no `.env`
- ✅ Formato correto: `5511999998888` (sem +, sem espaços)
- ✅ Verifique se popup não foi bloqueado pelo navegador

### Mesa não identificada
- ✅ Verifique `VITE_RESTAURANT_ENABLE_TABLE_QR=true`
- ✅ Limpe cache do navegador
- ✅ Teste URL manualmente: `?mesa=1`

### QR Code não escaneia
- ✅ Gere com tamanho maior: `--size 1024`
- ✅ Use papel de qualidade
- ✅ Proteja com laminação

---

## 📊 FLUXO TÉCNICO

```
1. Cliente acessa Menu
   ↓
2. Adiciona produtos ao carrinho (CartContext)
   ↓
3. Clica em "Carrinho"
   ↓
4. Redireciona para OrderCheckout
   ↓
5. Preenche formulário
   ↓
6. Clica "Enviar por WhatsApp"
   ↓
7. sendOrderViaWhatsApp() monta mensagem
   ↓
8. (Opcional) Salva pedido no Supabase
   ↓
9. Abre WhatsApp (wa.me) com mensagem
   ↓
10. Cliente confirma e envia
    ↓
11. Restaurante recebe no WhatsApp ✅
```

---

## 🎓 PRÓXIMOS PASSOS SUGERIDOS

### Curto Prazo
1. Testar sistema completo
2. Gerar QR Codes para as mesas
3. Imprimir e colar QR Codes
4. Treinar equipe

### Médio Prazo
1. Configurar analytics nos QR Codes
2. Adicionar notificações de pedido
3. Melhorar mensagem WhatsApp com marca

### Longo Prazo
1. Migrar para WhatsApp Business API
2. Implementar pagamento online
3. Sistema de fidelidade via QR

---

## 💡 DICAS IMPORTANTES

### Para Melhor Experiência

1. **QR Codes**:
   - Use tamanho mínimo 8x8cm
   - Proteja com laminação
   - Cole em local visível
   - Tenha backups impressos

2. **WhatsApp**:
   - Mantenha número sempre disponível
   - Responda rapidamente aos pedidos
   - Configure mensagens automáticas

3. **Configuração**:
   - Teste antes de lançar
   - Configure backup do número
   - Documente processos internos

### Personalização

Para personalizar a mensagem do WhatsApp, edite:
```
src/utils/whatsapp.ts
→ função buildOrderMessage()
```

Para personalizar o checkout, edite:
```
src/pages/OrderCheckout.tsx
```

---

## 📞 SUPORTE

1. **Documentação Técnica**: Ver `README.whatsapp-qr.md`
2. **QR Codes Detalhado**: Ver `README.qr.md`
3. **Código-fonte**: Ver arquivos em `src/`

---

## 🎉 CONCLUSÃO

Sistema completo implementado e pronto para uso!

**✅ Funcionalidades Entregues:**
- Envio de pedidos via WhatsApp
- Página de checkout profissional
- Geração de QR Codes por mesa
- Identificação automática de mesa
- Documentação completa

**🚀 Para Começar:**
1. Configure o `.env`
2. Teste o fluxo
3. Gere os QR Codes (opcional)
4. Lance em produção!

---

**Desenvolvido para**: seucardapiodigital  
**Data**: Dezembro 2024  
**Versão**: 1.0.0  

🌟 **Sucesso com seu cardápio digital!**
