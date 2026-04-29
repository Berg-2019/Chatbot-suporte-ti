import axios from 'axios';
import 'dotenv/config';

const key = process.env.MINIMAX_API_KEY;
const gid = process.env.MINIMAX_GROUP_ID;
const BASE = 'https://api.minimax.io/v1';

async function main() {
  console.log(`Key: ${key?.substring(0, 15)}...`);
  console.log(`GroupId: ${gid}\n`);

  // Test chat models
  const chatModels = ['MiniMax-M2.5', 'MiniMax-M2.7', 'MiniMax-M2', 'MiniMax-M1', 'M2-her', 'abab6-chat', 'abab6.5s-chat'];

  for (const model of chatModels) {
    try {
      console.log(`Chat model: ${model}`);
      const r = await axios.post(`${BASE}/text/chatcompletion_v2`, {
        model,
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
        temperature: 0.1,
      }, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        params: { GroupId: gid },
        timeout: 15000,
      });
      const resp = r.data?.base_resp || {};
      const choice = r.data?.choices?.[0]?.message?.content || '';
      console.log(`  ${resp.status_code === 0 ? '✅' : '❌'} code=${resp.status_code} msg="${resp.status_msg || choice}"`);
    } catch (e: any) {
      console.log(`  ❌ ${e.response?.data?.base_resp?.status_msg || e.message}`);
    }
  }

  // Test embeddings
  console.log('\n--- Embeddings ---');
  const embModels = ['embo-01', 'text-embedding-3-small', 'MiniMax-Embo-01'];
  for (const model of embModels) {
    try {
      console.log(`Embedding model: ${model}`);
      const r = await axios.post(`${BASE}/embeddings`, {
        model,
        texts: ['test'],
        type: 'db',
      }, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        params: { GroupId: gid },
        timeout: 15000,
      });
      const resp = r.data?.base_resp || {};
      const dims = r.data?.vectors?.[0]?.length || 0;
      console.log(`  ${resp.status_code === 0 ? '✅' : '❌'} code=${resp.status_code} msg="${resp.status_msg}" dims=${dims}`);
    } catch (e: any) {
      console.log(`  ❌ ${e.response?.data?.base_resp?.status_msg || e.message}`);
    }
  }

  // Also test OpenAI-compatible endpoint
  console.log('\n--- OpenAI-compatible /v1/chat/completions ---');
  try {
    const r = await axios.post(`${BASE}/chat/completions`, {
      model: 'MiniMax-M2.5',
      messages: [{ role: 'user', content: 'Say OK' }],
      max_tokens: 5,
    }, {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    console.log(`  ✅`, JSON.stringify(r.data?.choices?.[0]?.message || r.data?.base_resp || {}).substring(0, 150));
  } catch (e: any) {
    console.log(`  ❌ ${e.response?.status} ${e.response?.data?.base_resp?.status_msg || e.message}`);
  }
}

main();
