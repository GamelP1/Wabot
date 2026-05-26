const gTTS = require('node-gtts')('pt');
const fs = require('fs');

const stream = gTTS.stream('Olá, teste de voz!');
const writer = fs.createWriteStream('teste.mp3');

stream.pipe(writer);

writer.on('finish', () => console.log('✅ teste.mp3 gerado!'));
writer.on('error', (err) => console.error('❌ Erro:', err.message));