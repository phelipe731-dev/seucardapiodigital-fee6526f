import { createClient } from '@supabase/supabase-js';
import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// WhatsApp client state
let whatsappClient = null;
let currentQR = null;
let isReady = false;
let clientInfo = null;

/**
 * Initialize WhatsApp client
 */
function initializeWhatsApp() {
  console.log('🔄 Initializing WhatsApp client...');
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: process.env.SESSION_PATH || './whatsapp-session'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  // QR Code event
  whatsappClient.on('qr', async (qr) => {
    console.log('📱 QR Code received');
    currentQR = qr;
    isReady = false;
  });

  // Ready event
  whatsappClient.on('ready', async () => {
    console.log('✅ WhatsApp client is ready!');
    isReady = true;
    currentQR = null;
    
    const info = whatsappClient.info;
    clientInfo = {
      phone: info.wid.user,
      name: info.pushname,
      platform: info.platform
    };
    
    console.log(`📞 Connected as: ${clientInfo.name} (${clientInfo.phone})`);
  });

  // Authenticated event
  whatsappClient.on('authenticated', () => {
    console.log('🔐 WhatsApp authenticated');
  });

  // Auth failure event
  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    currentQR = null;
    isReady = false;
  });

  // Disconnected event
  whatsappClient.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp disconnected:', reason);
    isReady = false;
    clientInfo = null;
  });

  // Initialize
  whatsappClient.initialize().catch(error => {
    console.error('Failed to initialize WhatsApp client:', error);
  });
}

/**
 * Send WhatsApp message
 */
async function sendWhatsAppMessage(phone, message) {
  if (!isReady || !whatsappClient) {
    throw new Error('WhatsApp client is not ready');
  }

  try {
    // Format phone number (remove special characters and add country code if needed)
    let formattedPhone = phone.replace(/\D/g, '');
    
    // Add Brazil country code if not present
    if (!formattedPhone.startsWith('55') && formattedPhone.length === 11) {
      formattedPhone = '55' + formattedPhone;
    }
    
    const chatId = formattedPhone + '@c.us';
    
    await whatsappClient.sendMessage(chatId, message);
    console.log(`✓ Message sent to ${phone}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send message to ${phone}:`, error);
    throw error;
  }
}

/**
 * Format order message
 */
function formatOrderMessage(order, status) {
  const messages = {
    'received': `🔔 *Pedido Recebido!*\n\nOlá ${order.customer_name}!\n\nSeu pedido #${order.id.slice(0, 8)} foi recebido com sucesso!\n\n*Total:* R$ ${order.total_amount.toFixed(2).replace('.', ',')}\n*Forma de pagamento:* ${order.payment_method}\n\nEstamos preparando seu pedido. Aguarde! ⏳`,
    
    'preparing': `👨‍🍳 *Pedido em Preparo*\n\n${order.customer_name}, seu pedido está sendo preparado com muito carinho!\n\n*Pedido:* #${order.id.slice(0, 8)}\n\nEm breve estará pronto! 🔥`,
    
    'ready': `✅ *Pedido Pronto!*\n\n${order.customer_name}, seu pedido está pronto para retirada!\n\n*Pedido:* #${order.id.slice(0, 8)}\n\nVenha buscar enquanto está quentinho! 🍽️`,
    
    'out_for_delivery': `🛵 *Pedido Saiu para Entrega!*\n\n${order.customer_name}, seu pedido saiu para entrega!\n\n*Pedido:* #${order.id.slice(0, 8)}\n*Endereço:* ${order.notes || 'Não informado'}\n\nChega em breve! 📦`,
    
    'delivered': `🎉 *Pedido Entregue!*\n\n${order.customer_name}, seu pedido foi entregue!\n\n*Pedido:* #${order.id.slice(0, 8)}\n\nObrigado pela preferência! ❤️\nVolte sempre!`,
    
    'cancelled': `❌ *Pedido Cancelado*\n\n${order.customer_name}, infelizmente seu pedido foi cancelado.\n\n*Pedido:* #${order.id.slice(0, 8)}\n\nSe tiver dúvidas, entre em contato conosco.`
  };
  
  return messages[status] || `Status atualizado: ${status}`;
}

/**
 * Listen to order updates
 */
async function startOrderListener() {
  console.log('👂 Starting order status listener...');
  
  const channel = supabase
    .channel('orders-whatsapp')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders'
      },
      async (payload) => {
        const order = payload.new;
        const oldStatus = payload.old?.status;
        const newStatus = order.status;
        
        // Only send message if status changed
        if (oldStatus !== newStatus && order.customer_phone) {
          console.log(`📬 Order ${order.id.slice(0, 8)} status changed: ${oldStatus} → ${newStatus}`);
          
          try {
            const message = formatOrderMessage(order, newStatus);
            await sendWhatsAppMessage(order.customer_phone, message);
            console.log(`✓ Notification sent for order ${order.id.slice(0, 8)}`);
          } catch (error) {
            console.error(`✗ Failed to send notification:`, error);
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      },
      async (payload) => {
        const order = payload.new;
        
        if (order.customer_phone) {
          console.log(`📬 New order ${order.id.slice(0, 8)} received`);
          
          try {
            const message = formatOrderMessage(order, 'received');
            await sendWhatsAppMessage(order.customer_phone, message);
            console.log(`✓ Welcome message sent for order ${order.id.slice(0, 8)}`);
          } catch (error) {
            console.error(`✗ Failed to send welcome message:`, error);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✓ Subscribed to order updates');
      }
    });
}

/**
 * HTTP Server for admin interface
 */
function startHTTPServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      whatsapp: {
        ready: isReady,
        connected: clientInfo !== null,
        info: clientInfo
      },
      uptime: process.uptime()
    });
  });
  
  // Get QR Code
  app.get('/qr', async (req, res) => {
    if (isReady) {
      return res.json({
        success: true,
        connected: true,
        info: clientInfo
      });
    }
    
    if (!currentQR) {
      return res.json({
        success: false,
        message: 'No QR code available. Initializing...'
      });
    }
    
    try {
      const qrImage = await QRCode.toDataURL(currentQR);
      res.json({
        success: true,
        connected: false,
        qr: qrImage
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Disconnect WhatsApp
  app.post('/disconnect', async (req, res) => {
    try {
      if (whatsappClient) {
        await whatsappClient.logout();
        isReady = false;
        clientInfo = null;
        currentQR = null;
        
        // Reinitialize for new connection
        setTimeout(() => {
          initializeWhatsApp();
        }, 2000);
      }
      
      res.json({ success: true, message: 'Disconnected successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Test message
  app.post('/test', async (req, res) => {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone and message are required'
      });
    }
    
    try {
      await sendWhatsAppMessage(phone, message);
      res.json({
        success: true,
        message: 'Test message sent'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  const HTTP_PORT = process.env.HTTP_PORT || 3002;
  app.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTP server running on http://localhost:${HTTP_PORT}`);
    console.log(`   - GET /health - Health check`);
    console.log(`   - GET /qr - Get QR code for WhatsApp connection`);
    console.log(`   - POST /disconnect - Disconnect WhatsApp`);
    console.log(`   - POST /test - Send test message`);
  });
}

// Start services
console.log('🚀 WhatsApp Worker starting...');
initializeWhatsApp();
startHTTPServer();
startOrderListener();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  if (whatsappClient) {
    await whatsappClient.destroy();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  if (whatsappClient) {
    await whatsappClient.destroy();
  }
  process.exit(0);
});
