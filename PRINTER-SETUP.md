# 🖨️ Configuração do Sistema de Impressão

## Visão Geral

Sistema completo de impressão automática de pedidos com:
- Worker Node.js que escuta novos pedidos
- Impressão térmica via ESC/POS (TCP/IP)
- Geração automática de PDF
- Tela administrativa para configuração
- Suporte a Docker e systemd

## 📋 Pré-requisitos

1. **Impressora Térmica de Rede**
   - Compatível com ESC/POS
   - Conectada na mesma rede
   - Porta 9100 (padrão)

2. **Node.js 20+**
   - Instalar de https://nodejs.org

3. **Chave Service Role do Supabase**
   - Necessária para o worker se conectar

## 🚀 Instalação Rápida

### Passo 1: Configurar o Worker

```bash
cd printer-worker
npm install
cp .env.example .env
```

### Passo 2: Editar .env

```env
SUPABASE_URL=https://dnlpoxlplidkasolssro.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key_aqui

# IP da sua impressora (exemplo)
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100

# Habilitar PDF
SAVE_PDF=true
PDF_OUTPUT_DIR=./pdfs
```

### Passo 3: Iniciar o Worker

```bash
npm start
```

Você verá:
```
🖨️  Order Printer Worker starting...
📡 Supabase URL: https://...
✓ Subscribed to orders table  
👀 Watching for new orders...
```

## ⚙️ Configuração pelo Admin

1. Acesse `/admin/printer` no seu app
2. Configure o IP da impressora
3. Ajuste as opções de PDF
4. Teste com "Criar Pedido de Teste"

## 🔧 Descobrir IP da Impressora

### Windows
```powershell
# Verificar impressoras na rede
arp -a
```

### Linux/Mac
```bash
# Escanear rede local (instalar nmap)
nmap -p 9100 192.168.1.0/24
```

### Pela Impressora
- Geralmente tem opção no menu de imprimir configuração de rede
- Ou consultar manual da impressora

## 🐛 Solução de Problemas

### Worker não conecta ao Supabase
- Verifique `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`
- Service key precisa de permissões de leitura/escrita

### Impressora não imprime
1. Ping na impressora: `ping 192.168.1.100`
2. Testar porta: `telnet 192.168.1.100 9100`
3. Verificar se está ligada e online
4. Checar papel e fita

### PDF não gera
- Verificar permissões da pasta `pdfs/`
- Chromium instalado (Docker já inclui)

## 🔒 Segurança (IMPORTANTE!)

⚠️ A tabela `printer_configs` foi criada SEM políticas RLS por limitações técnicas.

**Para produção, adicione as policies manualmente:**

```sql
-- Via SQL Editor no Supabase Dashboard

CREATE POLICY "select_configs" ON printer_configs 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM restaurants 
    WHERE restaurants.id = printer_configs.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "insert_configs" ON printer_configs 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants 
    WHERE restaurants.id = printer_configs.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "update_configs" ON printer_configs 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM restaurants 
    WHERE restaurants.id = printer_configs.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "delete_configs" ON printer_configs 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM restaurants 
    WHERE restaurants.id = printer_configs.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);
```

## 🐳 Deploy com Docker

Ver `printer-worker/README.md` para instruções Docker e systemd.

## 📞 Suporte

Dúvidas? Consulte:
- `printer-worker/README.md` - Documentação completa
- Logs do worker para debugging
- Console do navegador na tela /admin/printer
