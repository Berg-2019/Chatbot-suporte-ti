const { OllamaClient } = require('./utils/ollama-fix');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function testAI() {
  console.log('Testing AI connection...');
  
  // Check if Ollama is available
  const status = OllamaClient.getStatus();
  console.log('Ollama Status:', status);
  
  // Check database for AI configuration
  const dbPath = path.join(__dirname, 'db', 'atendimento.db');
  const db = new sqlite3.Database(dbPath);
  
  db.get("SELECT valor FROM configuracoes WHERE chave = 'ollama_enabled'", (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return;
    }
    
    const isEnabled = row ? row.valor : 'not set';
    console.log('AI Enabled in DB:', isEnabled);
    
    // Try to generate a response
    if (status.available) {
      console.log('Generating test response...');
      OllamaClient.generateResponse('Hello!', 'Respond briefly and friendly.')
        .then(response => {
          console.log('Response:', response);
          db.close();
        })
        .catch(error => {
          console.error('Error generating response:', error);
          db.close();
        });
    } else {
      console.log('Ollama is not available.');
      db.close();
    }
  });
}

testAI().catch(console.error);
