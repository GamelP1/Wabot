const gTTS = require('node-gtts')('pt');
const fs = require('fs');
const path = require('path');

async function textToSpeech(texto) {
    return new Promise((resolve, reject) => {
        const caminho = path.join(__dirname, `tts_${Date.now()}.mp3`);
        
        gTTS.save(caminho, texto, (err) => {
            if (err) return reject(err);
            resolve(caminho);
        });
    });
}

module.exports = { textToSpeech };