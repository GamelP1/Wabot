const gTTS = require('node-gtts')('pt');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

async function textToSpeech(texto) {
    return new Promise((resolve, reject) => {
        const mp3 = path.join(__dirname, `tts_${Date.now()}.mp3`);
        const ogg = mp3.replace('.mp3', '.ogg');

        const stream = gTTS.stream(texto);
        const writer = fs.createWriteStream(mp3);

        stream.pipe(writer);

        writer.on('finish', () => {
            ffmpeg(mp3)
                .audioCodec('libopus')
                .format('ogg')
                .on('end', () => {
                    fs.unlinkSync(mp3); // apaga o mp3
                    resolve(ogg);
                })
                .on('error', reject)
                .save(ogg);
        });

        writer.on('error', reject);
        stream.on('error', reject);
    });
}

module.exports = { textToSpeech };