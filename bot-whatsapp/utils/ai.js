const axios = require("axios");

const API_KEY = "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"; // 🔁 Substitua pela sua chave real
const MODEL = "mistral/mistral-7b-instruct"; // ou outro de sua escolha

async function gerarResposta(mensagemUsuario) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: MODEL,
        messages: [
          { role: "system", content: "Você é um assistente inteligente de atendimento ao cliente via WhatsApp." },
          { role: "user", content: mensagemUsuario }
        ],
      },
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Erro ao consultar IA:", error.message);
    return "⚠️ Não consegui gerar uma resposta agora. Tente novamente em instantes.";
  }
}

module.exports = { gerarResposta };
