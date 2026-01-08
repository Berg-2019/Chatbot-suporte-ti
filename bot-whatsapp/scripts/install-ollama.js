#!/usr/bin/env node

/**
 * Script para instalar e configurar o Ollama
 * Este script ajuda a configurar o Ollama para uso com o bot WhatsApp
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Script de Instalação do Ollama para Bot WhatsApp');
console.log('===============================================\n');

// Verificar se o sistema operacional é Windows
const isWindows = process.platform === 'win32';

function checkOllamaInstalled() {
  try {
    execSync('ollama --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function installOllamaWindows() {
  console.log('📥 Baixando instalador do Ollama para Windows...');
  
  // Abrir página de download do Ollama
  try {
    if (isWindows) {
      execSync('start https://ollama.ai/download/OllamaSetup.exe', { stdio: 'ignore' });
    }
    console.log('✅ Por favor, instale o Ollama usando o instalador baixado.');
    console.log('🔗 URL: https://ollama.ai/download/OllamaSetup.exe\n');
  } catch (error) {
    console.log('⚠️  Não foi possível abrir o navegador automaticamente.');
    console.log('🔗 Acesse manualmente: https://ollama.ai/download/OllamaSetup.exe\n');
  }
}

function installOllamaLinux() {
  console.log('📥 Instalando Ollama no Linux...');
  
  try {
    execSync('curl -fsSL https://ollama.ai/install.sh | sh', { stdio: 'inherit' });
    console.log('✅ Ollama instalado com sucesso!\n');
  } catch (error) {
    console.log('❌ Erro ao instalar Ollama. Tente instalar manualmente:');
    console.log('   curl -fsSL https://ollama.ai/install.sh | sh\n');
  }
}

function startOllamaService() {
  console.log('🚀 Iniciando serviço Ollama...');
  
  try {
    if (isWindows) {
      // No Windows, o serviço é iniciado automaticamente após a instalação
      console.log('✅ No Windows, o serviço Ollama deve iniciar automaticamente.');
      console.log('🔧 Se não iniciar, execute: ollama serve\n');
    } else {
      // No Linux, iniciar o serviço
      execSync('sudo systemctl start ollama', { stdio: 'inherit' });
      console.log('✅ Serviço Ollama iniciado!\n');
    }
  } catch (error) {
    console.log('⚠️  Não foi possível iniciar o serviço Ollama automaticamente.');
    console.log('🔧 Inicie manualmente com: ollama serve\n');
  }
}

function pullModel(modelName = 'llama3.2:3b') {
  console.log(`📥 Baixando modelo ${modelName}...`);
  
  try {
    execSync(`ollama pull ${modelName}`, { stdio: 'inherit' });
    console.log(`✅ Modelo ${modelName} baixado com sucesso!\n`);
    return true;
  } catch (error) {
    console.log(`❌ Erro ao baixar modelo ${modelName}.`);
    console.log('🔧 Tente baixar manualmente com: ollama pull llama3.2:3b\n');
    return false;
  }
}

function createEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = `# Bot Configuration
BOT_NUMBER=5569981248816
ROOT_NUMBERS=5569981170027,556884268042

# Database
DB_PATH=./db/atendimento.db

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Logging
LOG_LEVEL=info

# Production Settings
NODE_ENV=production
PORT=3000
`;

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Arquivo .env criado com configurações padrão!\n');
  } else {
    console.log('⚠️  Arquivo .env já existe. Verifique se as configurações estão corretas.\n');
  }
}

function testOllamaConnection() {
  console.log('🧪 Testando conexão com Ollama...');
  
  try {
    const response = execSync('curl -s http://localhost:11434/api/tags', { encoding: 'utf8' });
    if (response) {
      console.log('✅ Conexão com Ollama bem-sucedida!\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Não foi possível conectar ao Ollama.');
    console.log('🔧 Verifique se o serviço está rodando com: ollama serve\n');
  }
  
  return false;
}

async function main() {
  console.log('🔍 Verificando instalação do Ollama...');
  
  if (!checkOllamaInstalled()) {
    console.log('❌ Ollama não está instalado.\n');
    
    if (isWindows) {
      installOllamaWindows();
    } else {
      installOllamaLinux();
    }
    
    console.log('💡 Após instalar o Ollama, execute este script novamente.');
    return;
  }
  
  console.log('✅ Ollama já está instalado!\n');
  
  // Criar arquivo .env se não existir
  createEnvFile();
  
  // Iniciar serviço Ollama
  startOllamaService();
  
  // Testar conexão
  if (!testOllamaConnection()) {
    console.log('🔧 Iniciando serviço Ollama...');
    const ollamaProcess = spawn('ollama', ['serve'], {
      stdio: 'ignore',
      detached: true
    });
    
    ollamaProcess.unref();
    
    // Aguardar um momento para o serviço iniciar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Testar conexão novamente
    testOllamaConnection();
  }
  
  // Baixar modelo padrão
  console.log('📥 Verificando modelo padrão...');
  pullModel('llama3.2:3b');
  
  console.log('🎉 Configuração concluída!');
  console.log('🚀 Agora você pode iniciar o bot com: npm start\n');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro durante a instalação:', error.message);
    process.exit(1);
  });
}

module.exports = {
  checkOllamaInstalled,
  installOllamaWindows,
  installOllamaLinux,
  startOllamaService,
  pullModel,
  createEnvFile,
  testOllamaConnection
};
