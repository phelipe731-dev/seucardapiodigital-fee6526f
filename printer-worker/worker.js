import { createClient } from '@supabase/supabase-js';
import net from 'net';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const INIT = ESC + '@';
const ALIGN_CENTER = ESC + 'a' + '1';
const ALIGN_LEFT = ESC + 'a' + '0';
const BOLD_ON = ESC + 'E' + '1';
const BOLD_OFF = ESC + 'E' + '0';
const CUT = GS + 'V' + '0';
const NEWLINE = '\n';

/**
 * Build ESC/POS receipt text
 */
function buildReceiptText(order, restaurant) {
  const lines = [];
  
  lines.push(INIT);
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON);
  lines.push((restaurant?.name || 'MEU RESTAURANTE').toUpperCase());
  lines.push(BOLD_OFF);
  lines.push(NEWLINE);
  
  if (restaurant?.address) {
    lines.push(restaurant.address);
    lines.push(NEWLINE);
  }
  
  if (restaurant?.phone) {
    lines.push(`Tel: ${restaurant.phone}`);
    lines.push(NEWLINE);
  }
  
  lines.push(ALIGN_LEFT);
  lines.push('-------------------------');
  lines.push(NEWLINE);
  
  lines.push(BOLD_ON);
  lines.push(`Pedido: ${order.id.slice(0, 8).toUpperCase()}`);
  lines.push(BOLD_OFF);
  lines.push(NEWLINE);
  
  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString('pt-BR');
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  lines.push(`Data: ${timeStr} - ${dateStr}`);
  lines.push(NEWLINE);
  
  lines.push(`Cliente: ${order.customer_name}`);
  lines.push(NEWLINE);
  
  if (order.customer_phone) {
    lines.push(`Tel: ${order.customer_phone}`);
    lines.push(NEWLINE);
  }
  
  lines.push('-------------------------');
  lines.push(NEWLINE);
  
  // Items
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  
  if (items && items.length > 0) {
    items.forEach(item => {
      const qty = item.quantity || item.qty || 1;
      const price = item.unit_price || item.price || 0;
      const total = qty * price;
      
      lines.push(`${qty} x ${item.name}`);
      lines.push(NEWLINE);
      lines.push(`    R$ ${total.toFixed(2).replace('.', ',')}`);
      lines.push(NEWLINE);
      
      if (item.observations) {
        lines.push(`    Obs: ${item.observations}`);
        lines.push(NEWLINE);
      }
    });
  }
  
  lines.push('-------------------------');
  lines.push(NEWLINE);
  
  lines.push(BOLD_ON);
  lines.push(ALIGN_CENTER);
  lines.push(`TOTAL: R$ ${(order.total_amount || 0).toFixed(2).replace('.', ',')}`);
  lines.push(BOLD_OFF);
  lines.push(ALIGN_LEFT);
  lines.push(NEWLINE);
  
  if (order.notes) {
    lines.push('-------------------------');
    lines.push(NEWLINE);
    lines.push('Observacoes:');
    lines.push(NEWLINE);
    lines.push(order.notes);
    lines.push(NEWLINE);
  }
  
  lines.push('-------------------------');
  lines.push(NEWLINE);
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON);
  lines.push('*** COZINHA ***');
  lines.push(BOLD_OFF);
  lines.push(NEWLINE);
  lines.push(NEWLINE);
  lines.push(NEWLINE);
  lines.push(CUT);
  
  return Buffer.from(lines.join(''), 'binary');
}

/**
 * Print to network thermal printer
 */
async function printToThermalPrinter(receiptBuffer, config) {
  const maxRetries = config.print_retries || 3;
  const timeout = config.print_timeout_ms || 10000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const client = new net.Socket();
        
        const timer = setTimeout(() => {
          client.destroy();
          reject(new Error('Print timeout'));
        }, timeout);
        
        client.connect(config.printer_port, config.printer_ip, () => {
          console.log(`✓ Connected to printer ${config.printer_ip}:${config.printer_port}`);
          client.write(receiptBuffer, (err) => {
            if (err) {
              clearTimeout(timer);
              client.destroy();
              reject(err);
            }
          });
        });
        
        client.on('end', () => {
          clearTimeout(timer);
          resolve();
        });
        
        client.on('close', () => {
          clearTimeout(timer);
          resolve();
        });
        
        client.on('error', (err) => {
          clearTimeout(timer);
          client.destroy();
          reject(err);
        });
      });
      
      console.log(`✓ Order printed successfully (attempt ${attempt}/${maxRetries})`);
      return true;
      
    } catch (error) {
      console.error(`✗ Print attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to print after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

/**
 * Generate PDF receipt
 */
async function generatePDFReceipt(order, restaurant, outputDir) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 20mm; }
    body {
      font-family: 'Courier New', monospace;
      margin: 0;
      padding: 20px;
      font-size: 12pt;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24pt;
      font-weight: bold;
    }
    .header p {
      margin: 5px 0;
    }
    .order-info {
      margin: 20px 0;
      border: 1px solid #000;
      padding: 15px;
    }
    .order-info p {
      margin: 5px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .items-table th,
    .items-table td {
      border: 1px solid #000;
      padding: 10px;
      text-align: left;
    }
    .items-table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .total {
      text-align: right;
      font-size: 16pt;
      font-weight: bold;
      margin: 20px 0;
      padding: 15px;
      border: 2px solid #000;
    }
    .observations {
      margin: 20px 0;
      padding: 15px;
      border: 1px dashed #000;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #000;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${restaurant?.name || 'MEU RESTAURANTE'}</h1>
    ${restaurant?.address ? `<p>${restaurant.address}</p>` : ''}
    ${restaurant?.phone ? `<p>Tel: ${restaurant.phone}</p>` : ''}
  </div>
  
  <div class="order-info">
    <p><strong>Pedido:</strong> ${order.id.slice(0, 8).toUpperCase()}</p>
    <p><strong>Data:</strong> ${new Date(order.created_at).toLocaleString('pt-BR')}</p>
    <p><strong>Cliente:</strong> ${order.customer_name}</p>
    ${order.customer_phone ? `<p><strong>Telefone:</strong> ${order.customer_phone}</p>` : ''}
    <p><strong>Pagamento:</strong> ${order.payment_method}</p>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Qtd</th>
        <th>Item</th>
        <th>Preço Unit.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => {
        const qty = item.quantity || item.qty || 1;
        const price = item.unit_price || item.price || 0;
        const total = qty * price;
        
        return `
          <tr>
            <td>${qty}</td>
            <td>
              ${item.name}
              ${item.observations ? `<br><small>Obs: ${item.observations}</small>` : ''}
            </td>
            <td>R$ ${price.toFixed(2).replace('.', ',')}</td>
            <td>R$ ${total.toFixed(2).replace('.', ',')}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <div class="total">
    TOTAL: R$ ${(order.total_amount || 0).toFixed(2).replace('.', ',')}
  </div>
  
  ${order.notes ? `
    <div class="observations">
      <strong>Observações:</strong><br>
      ${order.notes}
    </div>
  ` : ''}
  
  <div class="footer">
    <p><strong>Obrigado pela preferência!</strong></p>
    <p>Cardápio Digital - ${new Date().getFullYear()}</p>
  </div>
</body>
</html>
    `;
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `pedido-${order.id.slice(0, 8)}-${Date.now()}.pdf`;
    const filepath = path.join(outputDir, filename);
    
    await page.pdf({
      path: filepath,
      format: 'A4',
      printBackground: true
    });
    
    console.log(`✓ PDF generated: ${filepath}`);
    return filepath;
    
  } finally {
    await browser.close();
  }
}

/**
 * Process new order
 */
async function processOrder(order) {
  console.log(`\n📋 Processing order ${order.id.slice(0, 8)}...`);
  
  try {
    // Get restaurant info
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', order.restaurant_id)
      .single();
    
    // Get printer config for this restaurant
    const { data: printerConfig } = await supabase
      .from('printer_configs')
      .select('*')
      .eq('restaurant_id', order.restaurant_id)
      .eq('is_active', true)
      .single();
    
    if (!printerConfig) {
      console.log('⚠ No active printer config found, using defaults from .env');
      // Use defaults from environment
      printerConfig = {
        printer_ip: process.env.PRINTER_IP,
        printer_port: parseInt(process.env.PRINTER_PORT || '9100'),
        save_pdf: process.env.SAVE_PDF === 'true',
        pdf_output_dir: process.env.PDF_OUTPUT_DIR || './pdfs',
        print_retries: parseInt(process.env.PRINT_RETRIES || '3'),
        print_timeout_ms: parseInt(process.env.PRINT_TIMEOUT_MS || '10000')
      };
    }
    
    // Fetch order items if not included
    let orderWithItems = order;
    if (!order.items) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, products(name)')
        .eq('order_id', order.id);
      
      orderWithItems = {
        ...order,
        items: orderItems?.map(item => ({
          name: item.products?.name || 'Item',
          quantity: item.quantity,
          unit_price: item.unit_price,
          observations: item.observations
        })) || []
      };
    }
    
    // Build receipt
    const receiptBuffer = buildReceiptText(orderWithItems, restaurant);
    
    // Print to thermal printer
    if (printerConfig.printer_ip) {
      await printToThermalPrinter(receiptBuffer, printerConfig);
    } else {
      console.log('⚠ Printer IP not configured, skipping thermal print');
    }
    
    // Generate PDF if enabled
    let pdfPath = null;
    if (printerConfig.save_pdf) {
      pdfPath = await generatePDFReceipt(orderWithItems, restaurant, printerConfig.pdf_output_dir);
    }
    
    // Update order as printed
    await supabase
      .from('orders')
      .update({
        printed: true,
        printed_at: new Date().toISOString()
      })
      .eq('id', order.id);
    
    console.log(`✓ Order ${order.id.slice(0, 8)} processed successfully`);
    
  } catch (error) {
    console.error(`✗ Error processing order ${order.id.slice(0, 8)}:`, error);
    throw error;
  }
}

/**
 * Start worker
 */
async function startWorker() {
  console.log('🖨️  Order Printer Worker starting...');
  console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL}`);
  
  // Subscribe to new orders
  const channel = supabase
    .channel('orders-printer')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      },
      async (payload) => {
        console.log('🔔 New order detected!');
        try {
          await processOrder(payload.new);
        } catch (error) {
          console.error('Failed to process order:', error);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✓ Subscribed to orders table');
        console.log('👀 Watching for new orders...\n');
      }
    });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received, shutting down gracefully...');
    supabase.removeChannel(channel);
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received, shutting down gracefully...');
    supabase.removeChannel(channel);
    process.exit(0);
  });
}

// Start the worker
startWorker().catch((error) => {
  console.error('Fatal error starting worker:', error);
  process.exit(1);
});
