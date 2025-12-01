# 📱 WhatsApp Worker - Integração Simples

Integração super simples com WhatsApp Web para envio automático de notificações de pedidos.

## ✨ Funcionalidades

- ✅ Conexão via QR Code (igual WhatsApp Web)
- ✅ Notificações automáticas de pedidos
- ✅ Interface administrativa integrada
- ✅ Sem necessidade de API paga
- ✅ Sem necessidade de servidor externo

## 🚀 Instalação Rápida

### 1. Instalar Dependências

```bash
cd whatsapp-worker
npm install
```

### 2. Configurar .env

```bash
cp .env.example .env
```

Edite o `.env` e adicione sua Service Key do Supabase:

```env
SUPABASE_URL=https://dnlpoxlplidkasolssro.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui
HTTP_PORT=3002
```

### 3. Iniciar Worker

```bash
npm start
```

Você verá:
```
🚀 WhatsApp Worker starting...
🔄 Initializing WhatsApp client...
🌐 HTTP server running on http://localhost:3002
👂 Starting order status listener...
✓ Subscribed to order updates
📱 QR Code received
```

### 4. Conectar no Admin

1. Acesse `/admin` na aba **WhatsApp**
2. Clique em **"Conectar WhatsApp"**
3. Escaneie o QR Code com seu WhatsApp
4. Pronto! ✅

## 📬 Mensagens Automáticas

O sistema envia automaticamente as seguintes mensagens:

### 🔔 Pedido Recebido
```
🔔 Pedido Recebido!

Olá [Nome]!

Seu pedido #[ID] foi recebido com sucesso!

Total: R$ [valor]
Forma de pagamento: [método]

Estamos preparando seu pedido. Aguarde! ⏳
```

### 👨‍🍳 Em Preparo
```
👨‍🍳 Pedido em Preparo

[Nome], seu pedido está sendo preparado com muito carinho!

Pedido: #[ID]

Em breve estará pronto! 🔥
```

### ✅ Pronto para Retirada
```
✅ Pedido Pronto!

[Nome], seu pedido está pronto para retirada!

Pedido: #[ID]

Venha buscar enquanto está quentinho! 🍽️
```

### 🛵 Saiu para Entrega
```
🛵 Pedido Saiu para Entrega!

[Nome], seu pedido saiu para entrega!

Pedido: #[ID]
Endereço: [endereço]

Chega em breve! 📦
```

### 🎉 Entregue
```
🎉 Pedido Entregue!

[Nome], seu pedido foi entregue!

Pedido: #[ID]

Obrigado pela preferência! ❤️
Volte sempre!
```

## 🔧 Endpoints da API

### GET /health
Verifica status do worker

**Resposta:**
```json
{
  "status": "ok",
  "whatsapp": {
    "ready": true,
    "connected": true,
    "info": {
      "phone": "5511999998888",
      "name": "Meu Restaurante",
      "platform": "android"
    }
  },
  "uptime": 1234.56
}
```

### GET /qr
Obtém QR Code para conexão

**Resposta (quando desconectado):**
```json
{
  "success": true,
  "connected": false,
  "qr": "data:image/png;base64,..."
}
```

**Resposta (quando conectado):**
```json
{
  "success": true,
  "connected": true,
  "info": {
    "phone": "5511999998888",
    "name": "Meu Restaurante",
    "platform": "android"
  }
}
```

### POST /disconnect
Desconecta WhatsApp

**Resposta:**
```json
{
  "success": true,
  "message": "Disconnected successfully"
}
```

### POST /test
Envia mensagem de teste

**Body:**
```json
{
  "phone": "5511999998888",
  "message": "Mensagem de teste"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Test message sent"
}
```

## 🎯 Como Funciona

1. **Worker conecta ao Supabase**: Escuta mudanças na tabela `orders`
2. **Cliente faz pedido**: Novo pedido é inserido no banco
3. **Worker detecta**: Realtime trigger notifica o worker
4. **Mensagem é enviada**: Worker formata e envia via WhatsApp
5. **Cliente recebe**: Notificação instantânea no WhatsApp

## 🐛 Troubleshooting

### QR Code não aparece
- Verifique se o worker está rodando
- Aguarde alguns segundos para inicializar
- Verifique os logs no terminal

### Mensagens não são enviadas
- Verifique se WhatsApp está conectado (status "Online")
- Confirme que `SUPABASE_SERVICE_KEY` está correto
- Verifique logs para erros

### Desconexão frequente
- WhatsApp Web pode desconectar após 14 dias de inatividade
- Mantenha o worker rodando continuamente
- Reconecte escaneando novo QR Code

### Formato de telefone
- Use formato: código do país + DDD + número
- Exemplo: `5511999998888` (Brasil)
- Sem espaços, parênteses ou hífens

## 🐳 Deploy com Docker

```dockerfile
# Ver whatsapp-worker/Dockerfile
docker build -t whatsapp-worker .
docker run -d \
  --name whatsapp-worker \
  --env-file .env \
  -v $(pwd)/whatsapp-session:/app/whatsapp-session \
  -p 3002:3002 \
  --restart unless-stopped \
  whatsapp-worker
```

## 🔄 Manutenção

### Ver Logs
```bash
# Node direto
npm start

# PM2
pm2 logs whatsapp-worker

# Docker
docker logs -f whatsapp-worker
```

### Limpar Sessão
Se precisar reconectar:
```bash
rm -rf whatsapp-session/
npm start
```

### Atualizar
```bash
git pull
npm install
npm start
```

## 📊 Monitoramento

O worker mantém:
- Sessão persistente em `./whatsapp-session/`
- Logs no terminal/console
- Status via endpoint `/health`

## ⚠️ Notas Importantes

1. **Mantenha rodando**: Worker precisa estar ativo para notificações funcionarem
2. **Uma conta por worker**: Cada worker = uma conexão WhatsApp
3. **Respeite limites**: WhatsApp pode banir por spam/abuso
4. **Backup da sessão**: Guarde `whatsapp-session/` para não perder conexão

## 📄 Licença

MIT
