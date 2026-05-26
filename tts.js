const gTTS = require('node-gtts')('pt');
const fs = require('fs');
const path = require('path');

async function textToSpeech(texto) {
    return new Promise((resolve, reject) => {
        const caminho = path.join(__dirname, `tts_${Date.now()}.mp3`);
        const stream = gTTS.stream(texto);
        const writer = fs.createWriteStream(caminho);

        stream.pipe(writer);

        writer.on('finish', () => resolve(caminho));
        writer.on('error', reject);
        stream.on('error', reject);
    });
}

module.exports = { textToSpeech };