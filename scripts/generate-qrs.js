#!/usr/bin/env node

/**
 * Gerador de QR Codes por Mesa
 * 
 * Uso:
 * node scripts/generate-qrs.js --host https://meurestaurante.com --from 1 --to 20 --out ./qr-pngs --size 512
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Parse argumentos da linha de comando
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    host: 'http://localhost:8080',
    from: 1,
    to: 20,
    out: './qr-pngs',
    size: 512,
    prefix: 'mesa-',
    utm: true,
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'from' || key === 'to' || key === 'size') {
      options[key] = parseInt(value);
    } else if (key === 'utm') {
      options[key] = value === 'true';
    } else {
      options[key] = value;
    }
  }

  return options;
}

// Gera um único QR Code
async function generateQRCode(url, outputPath, size) {
  try {
    await QRCode.toFile(outputPath, url, {
      errorCorrectionLevel: 'M',
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return true;
  } catch (error) {
    console.error(`Erro ao gerar QR Code: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  const options = parseArgs();
  
  console.log('🎯 Gerador de QR Codes por Mesa');
  console.log('================================');
  console.log(`Host: ${options.host}`);
  console.log(`Mesas: ${options.from} até ${options.to}`);
  console.log(`Diretório: ${options.out}`);
  console.log(`Tamanho: ${options.size}px`);
  console.log('================================\n');

  // Criar diretório se não existir
  if (!fs.existsSync(options.out)) {
    fs.mkdirSync(options.out, { recursive: true });
    console.log(`✅ Diretório criado: ${options.out}\n`);
  }

  let successCount = 0;
  let errorCount = 0;

  // Gerar QR Codes
  for (let mesa = options.from; mesa <= options.to; mesa++) {
    const mesaStr = mesa.toString().padStart(2, '0');
    const filename = `${options.prefix}${mesaStr}.png`;
    const outputPath = path.join(options.out, filename);
    
    // Montar URL
    let url = `${options.host}/menu?mesa=${mesa}`;
    if (options.utm) {
      url += `&utm_source=qr_mesa&utm_medium=qrcode&utm_campaign=mesa_${mesaStr}`;
    }

    console.log(`⏳ Gerando: ${filename}...`);
    
    const success = await generateQRCode(url, outputPath, options.size);
    
    if (success) {
      successCount++;
      console.log(`✅ ${filename} criado com sucesso!`);
    } else {
      errorCount++;
      console.log(`❌ Erro ao criar ${filename}`);
    }
  }

  // Resumo
  console.log('\n================================');
  console.log('📊 Resumo da Geração');
  console.log('================================');
  console.log(`✅ Sucesso: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📁 Arquivos salvos em: ${path.resolve(options.out)}`);
  console.log('================================\n');

  // Gerar arquivo README
  const readmePath = path.join(options.out, 'README.txt');
  const readmeContent = `
QR CODES POR MESA - ${new Date().toLocaleDateString('pt-BR')}
================================================================

Total de QR Codes gerados: ${successCount}
Mesas: ${options.from} até ${options.to}
Tamanho: ${options.size}x${options.size}px

COMO USAR:
1. Imprima os arquivos PNG (recomendado: papel adesivo ou plástico)
2. Cole cada QR Code na mesa correspondente
3. Os clientes podem escanear com a câmera do celular
4. Serão redirecionados automaticamente para o cardápio
5. O número da mesa será preenchido automaticamente

FORMATO DOS ARQUIVOS:
- ${options.prefix}01.png → Mesa 1
- ${options.prefix}02.png → Mesa 2
- ... e assim por diante

URL BASE: ${options.host}/menu?mesa=XX

DICAS DE IMPRESSÃO:
- Use papel de alta qualidade ou material impermeável
- Tamanho recomendado: 8x8cm ou maior
- Teste cada QR Code após imprimir
- Proteja com plástico ou laminação

================================================================
Gerado por: seucardapiodigital
Data: ${new Date().toLocaleString('pt-BR')}
================================================================
`;

  fs.writeFileSync(readmePath, readmeContent.trim());
  console.log(`📄 README criado: ${readmePath}\n`);
  
  console.log('🎉 Processo concluído!');
  console.log('💡 Dica: Teste os QR Codes escaneando com seu celular antes de imprimir.\n');
}

// Verificar se o pacote qrcode está instalado
try {
  require('qrcode');
} catch (error) {
  console.error('\n❌ ERRO: Pacote "qrcode" não está instalado!');
  console.error('Execute: npm install qrcode\n');
  process.exit(1);
}

// Executar
main().catch((error) => {
  console.error('\n❌ Erro fatal:', error.message);
  process.exit(1);
});
