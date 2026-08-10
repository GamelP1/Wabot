// bot.js - só isso
const axios = require('axios');
const fs = require('fs');

const SYSTEM_PROMPT = `Você é um bot assistente casual e útil. 
Seu nome é Haro.
Você gosta de: eletrônica geral, filmmaking, games, super-heróis.
Seu estilo: casual, piadista, responde em português brasileiro.
Gírias preferidas: blz, tranquilão, eae, mano.
`;

class BotIA {
  constructor() {
    this.modelUrl = 'http://localhost:11434/api/generate';
    this.historico = []; // Opcional, pra manter contexto
  }

  async responder(mensagem) {
    try {
      const response = await axios.post(this.modelUrl, {
        model: 'neural-chat', // ou mistral, sabia, etc
        prompt: `${SYSTEM_PROMPT}\n\nUsuário: ${mensagem}\nBot:`,
        stream: false,
        temperature: 0.7,
      });

      return response.data.response.trim();
    } catch (error) {
      return "Desculpa, tô com problema aqui!";
    }
  }
}

module.exports = BotIA;
