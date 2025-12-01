/**
 * Utilitário para envio de pedidos via WhatsApp
 */

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  observations?: string;
  selectedOptions?: Array<{
    optionName: string;
    items: Array<{
      itemName: string;
      itemPrice: number;
    }>;
  }>;
}

interface SendOrderOptions {
  phone?: string;
  observations?: string;
  saveToDb?: boolean;
  saveEndpoint?: string;
  openInNewTab?: boolean;
  restaurantId?: string;
  orderType?: 'delivery' | 'pickup';
  deliveryAddress?: string;
  deliveryFee?: number;
}

/**
 * Formata valor para moeda brasileira
 */
function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  });
}

/**
 * Calcula o total de um item incluindo opções
 */
function calculateItemTotal(item: OrderItem): number {
  let itemTotal = item.price;
  
  if (item.selectedOptions) {
    item.selectedOptions.forEach(option => {
      option.items.forEach(optItem => {
        itemTotal += optItem.itemPrice;
      });
    });
  }
  
  return itemTotal * item.quantity;
}

/**
 * Monta a mensagem do pedido para WhatsApp
 */
function buildOrderMessage(
  order: OrderItem[], 
  customerName: string, 
  table?: string | number,
  options?: SendOrderOptions
): string {
  const lines: string[] = [];
  
  // Cabeçalho
  const customerInfo = table ? `${customerName} (Mesa ${table})` : customerName;
  lines.push(`🍽️ *Pedido - ${customerInfo}*`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  
  // Items do pedido
  order.forEach(item => {
    const itemPrice = formatCurrency(item.price);
    lines.push(`*${item.quantity}x ${item.name}*`);
    lines.push(`   ${itemPrice} cada`);
    
    // Opções selecionadas
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach(option => {
        lines.push(`   _${option.optionName}:_`);
        option.items.forEach(optItem => {
          const optPrice = optItem.itemPrice > 0 ? ` (+${formatCurrency(optItem.itemPrice)})` : '';
          lines.push(`      • ${optItem.itemName}${optPrice}`);
        });
      });
    }
    
    // Observações do item
    if (item.observations) {
      lines.push(`   📝 _${item.observations}_`);
    }
    
    // Total do item
    const itemTotal = calculateItemTotal(item);
    lines.push(`   Subtotal: ${formatCurrency(itemTotal)}`);
    lines.push('');
  });
  
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Totais
  const subtotal = order.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  lines.push(`*Subtotal:* ${formatCurrency(subtotal)}`);
  
  if (options?.deliveryFee && options.deliveryFee > 0) {
    lines.push(`*Taxa de entrega:* ${formatCurrency(options.deliveryFee)}`);
    const total = subtotal + options.deliveryFee;
    lines.push(`*Total:* ${formatCurrency(total)}`);
  } else {
    lines.push(`*Total:* ${formatCurrency(subtotal)}`);
  }
  
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Tipo de pedido
  if (options?.orderType === 'delivery' && options?.deliveryAddress) {
    lines.push('');
    lines.push('📍 *Entrega:*');
    lines.push(options.deliveryAddress);
  } else {
    lines.push('');
    lines.push('🏪 *Retirada no local*');
  }
  
  // Observações gerais
  if (options?.observations && options.observations.trim()) {
    lines.push('');
    lines.push('📝 *Observações:*');
    lines.push(options.observations);
  }
  
  lines.push('');
  lines.push('_Enviado via Cardápio Digital_ 🚀');
  
  return lines.join('\n');
}

/**
 * Envia o pedido via WhatsApp
 */
export async function sendOrderViaWhatsApp(
  order: OrderItem[],
  customerName: string,
  table?: string | number,
  options: SendOrderOptions = {}
): Promise<void> {
  // Validações
  if (!order || order.length === 0) {
    throw new Error('Carrinho vazio. Adicione itens antes de enviar o pedido.');
  }
  
  if (!customerName || !customerName.trim()) {
    throw new Error('Por favor, informe seu nome ou número da mesa.');
  }
  
  const phone = options.phone || import.meta.env.VITE_RESTAURANT_WHATS_NUMBER;
  if (!phone) {
    throw new Error('Número do restaurante não configurado. Entre em contato com o estabelecimento.');
  }
  
  // Monta a mensagem
  const message = buildOrderMessage(order, customerName, table, options);
  const encodedMessage = encodeURIComponent(message);
  
  // Salvar no banco de dados (opcional)
  if (options.saveToDb && options.saveEndpoint && options.restaurantId) {
    try {
      const subtotal = order.reduce((sum, item) => sum + calculateItemTotal(item), 0);
      const total = subtotal + (options.deliveryFee || 0);
      
      await fetch(options.saveEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: options.restaurantId,
          customer_name: customerName,
          customer_phone: '',
          items: order,
          total,
          subtotal,
          delivery_fee: options.deliveryFee || 0,
          delivery_address: options.deliveryAddress || '',
          table_number: table,
          method: 'whatsapp',
          status: 'sent_to_whatsapp',
          observations: options.observations || '',
        }),
      });
    } catch (error) {
      console.warn('Falha ao salvar pedido no banco de dados:', error);
      // Continua com o envio mesmo se falhar ao salvar
    }
  }
  
  // Determina o link do WhatsApp
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const whatsappUrl = isMobile
    ? `https://wa.me/${phone}?text=${encodedMessage}`
    : `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
  
  // Abre o WhatsApp
  if (options.openInNewTab === false) {
    window.location.href = whatsappUrl;
  } else {
    const newWindow = window.open(whatsappUrl, '_blank');
    if (!newWindow) {
      // Fallback se o popup foi bloqueado
      window.location.href = whatsappUrl;
    }
  }
}

/**
 * Valida se o número de WhatsApp está configurado
 */
export function isWhatsAppConfigured(phone?: string): boolean {
  const whatsappNumber = phone || import.meta.env.VITE_RESTAURANT_WHATS_NUMBER;
  return !!whatsappNumber && whatsappNumber.length >= 10;
}
