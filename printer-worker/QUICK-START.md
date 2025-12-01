# 🚀 Guia Rápido - Descoberta Automática de Impressoras

## Setup em 3 Passos

### 1️⃣ Instalar e Iniciar o Worker

```bash
cd printer-worker
npm install
cp .env.example .env
```

Edite o `.env` e adicione sua Service Key do Supabase:
```env
SUPABASE_URL=https://dnlpoxlplidkasolssro.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui
```

Inicie o worker:
```bash
npm start
```

Você verá:
```
🖨️  Order Printer Worker starting...
🌐 HTTP server running on http://localhost:3001
   - GET /health - Health check
   - GET /scan - Scan network for printers
   - GET /test/:ip - Test specific printer
```

### 2️⃣ Configurar na Interface Admin

1. Acesse `/admin/printer` no seu app
2. Clique em **"Buscar"** na seção "Buscar Impressoras Automaticamente"
3. Aguarde o scan (1-2 minutos)
4. Veja a lista de impressoras encontradas!

### 3️⃣ Selecionar e Testar

1. Clique na impressora desejada da lista
2. O IP será preenchido automaticamente
3. Clique em **"Salvar Configuração"**
4. Teste com **"Criar Pedido de Teste"**

## 🎯 Funcionamento

O sistema escaneia automaticamente:
- Rede: `192.168.1.x` (configurável via `BASE_IP`)
- Porta: `9100` (padrão para impressoras térmicas)
- Range: IPs de .1 até .255

## 🔧 Configurações Avançadas

### Mudar range de IP

Edite `.env`:
```env
BASE_IP=192.168.0    # Para rede 192.168.0.x
BASE_IP=10.0.0       # Para rede 10.0.0.x
```

### Mudar porta HTTP

```env
HTTP_PORT=3002
```

Atualize também na interface admin (campo "URL do Worker")

## 🐛 Troubleshooting

### Worker não inicia
```bash
# Verificar se porta 3001 está livre
lsof -i :3001

# Usar porta diferente
HTTP_PORT=3002 npm start
```

### Scan não encontra impressoras
1. Verifique se impressora está **ligada**
2. Verifique se está na **mesma rede**
3. Teste ping manual: `ping 192.168.1.100`
4. Ajuste `BASE_IP` no `.env` se usar rede diferente

### Erro CORS na interface
O worker já tem CORS habilitado. Se erro persistir:
- Verifique se worker está rodando
- Confirme URL correta em "URL do Worker"

## 📝 Exemplo de Uso

```bash
# Terminal 1: Worker
cd printer-worker
npm start

# Navegador: Acesse
http://localhost:5173/admin/printer

# 1. Clique em "Buscar"
# 2. Aguarde scan
# 3. Clique na impressora encontrada
# 4. Salvar
# 5. Testar!
```

## 🎉 Pronto!

Agora sua impressão está configurada e funcionando automaticamente!

Toda vez que um cliente fizer um pedido:
- ✅ Worker detecta automaticamente
- ✅ Imprime na impressora selecionada
- ✅ Gera PDF (se habilitado)
- ✅ Atualiza status no banco

**Dúvidas?** Consulte `README.md` para documentação completa.
