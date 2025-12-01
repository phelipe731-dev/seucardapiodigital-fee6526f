# 🖨️ Order Printer Worker

Worker Node.js para impressão automática de pedidos em impressoras térmicas de rede.

## 📋 Funcionalidades

- ✅ Escuta novos pedidos via Supabase Realtime
- ✅ Impressão automática em impressoras térmicas (ESC/POS)
- ✅ Geração de PDF profissional dos recibos
- ✅ Sistema de retry configurável
- ✅ Suporte a múltiplos restaurantes
- ✅ Configuração por restaurante no banco de dados
- ✅ Docker e systemd ready

## 🚀 Instalação

### Método 1: Node.js direto

```bash
cd printer-worker
npm install
cp .env.example .env
# Editar .env com suas configurações
npm start
```

### Método 2: Docker

```bash
cd printer-worker
docker build -t order-printer-worker .
docker run -d \
  --name order-printer \
  --env-file .env \
  --network host \
  --restart unless-stopped \
  -v $(pwd)/pdfs:/app/pdfs \
  order-printer-worker
```

### Método 3: systemd (Linux)

```bash
# Copiar arquivos para /opt
sudo mkdir -p /opt/order-printer-worker
sudo cp -r printer-worker/* /opt/order-printer-worker/
cd /opt/order-printer-worker

# Instalar dependências
npm install --production

# Configurar .env
sudo cp .env.example .env
sudo nano .env

# Criar usuário
sudo useradd -r -s /bin/false printer

# Ajustar permissões
sudo chown -R printer:printer /opt/order-printer-worker

# Instalar serviço
sudo cp order-printer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable order-printer
sudo systemctl start order-printer

# Ver logs
sudo journalctl -u order-printer -f
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key

# Impressora (valores padrão, sobrescritos pelo banco)
PRINTER_IP=192.168.0.100
PRINTER_PORT=9100

# PDF
SAVE_PDF=true
PDF_OUTPUT_DIR=./pdfs

# Retry
PRINT_RETRIES=3
PRINT_TIMEOUT_MS=10000
```

### Configuração por Restaurante

Cada restaurante pode ter sua própria configuração na tabela `printer_configs`:

- IP e porta da impressora
- Habilitar/desabilitar PDF
- Diretório de saída dos PDFs
- Número de tentativas e timeout

A configuração é gerenciada pela tela administrativa em `/admin/printer`.

## 🖨️ Impressoras Compatíveis

Qualquer impressora térmica que:
- Suporte protocolo ESC/POS
- Tenha interface de rede (TCP/IP)
- Escute na porta 9100 (padrão) ou configurável

**Marcas testadas:**
- Epson TM-T20
- Bematech MP-4200
- Elgin i9
- Daruma DR-800

## 📝 Layout do Recibo

```
MEU RESTAURANTE
-------------------------
Pedido: 12A4B5C6
Data: 14:23 - 01/12/2025
Cliente: João Silva
-------------------------
2 x Estrogonofe     R$ 64,00
1 x Pastel carne    R$ 8,50
-------------------------
TOTAL: R$ 72,50
Observações:
Sem cebola
-------------------------
*** COZINHA ***
```

## 🧪 Testes

### Teste manual de impressão

```bash
node worker.js --test
```

### Teste via admin

Acesse `/admin/printer` e clique em "Imprimir Teste"

## 🐛 Troubleshooting

### Impressora não imprime

1. Verifique se a impressora está ligada e conectada à rede
2. Teste ping: `ping 192.168.0.100`
3. Verifique se a porta 9100 está aberta: `telnet 192.168.0.100 9100`
4. Verifique os logs do worker

### PDF não é gerado

1. Verifique se `SAVE_PDF=true`
2. Verifique permissões do diretório `pdfs/`
3. Verifique logs de erro do Puppeteer

### Worker não conecta ao Supabase

1. Verifique `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`
2. Verifique conexão com internet
3. Verifique firewall/proxy

## 📊 Logs

### Docker
```bash
docker logs -f order-printer
```

### systemd
```bash
sudo journalctl -u order-printer -f
```

### Node direto
Os logs aparecem no console onde o worker foi iniciado

## 🔄 Atualização

```bash
# Docker
docker stop order-printer
docker rm order-printer
docker build -t order-printer-worker .
docker run -d ... # (mesmo comando de instalação)

# systemd
sudo systemctl stop order-printer
cd /opt/order-printer-worker
git pull  # ou copiar novos arquivos
npm install --production
sudo systemctl start order-printer

# Node direto
cd printer-worker
git pull  # ou copiar novos arquivos
npm install
npm start
```

## 📄 Licença

MIT
