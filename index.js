const express = require('express')
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const P = require('pino')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const app = express()
const { textToSpeech } = require('./tts')
const port = process.env.PORT || 4000 

async function downloadTikTok(url) {
    const params = new URLSearchParams();
    params.append('id', url);
    params.append('locale', 'pt');
    params.append('tt', 'NjZhOTg4');

    const response = await axios.post('https://ssstik.io/abc?url=dl', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://ssstik.io/'
        },
        timeout: 15000
    });

    const html = response.data;
    const match = html.match(/href="(https:\/\/tikcdn\.io\/ssstik\/[^"]+)"[^>]*class="[^"]*without_watermark[^"]*"/);

    if (!match) throw new Error('Link não encontrado');

    const videoResponse = await axios.get(match[1], {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
            'Referer': 'https://ssstik.io/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    return Buffer.from(videoResponse.data);
}

function extrairTexto(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    null
  )
}
// Inicia o bot 
async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()
  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04']
  })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('Escaneie o QR Code abaixo:')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'connecting') {
      console.log('Conecting...')
    }
    if (connection === 'open') {
      console.log('sucess')
    }
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut

      console.log('Conexão fechada. Reconectar?', shouldReconnect)
      if (shouldReconnect) {
        iniciarBot()
      }
    }
  })

  // RECEBE MENSAGENS
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg?.message) return
    const from = msg.key.remoteJid
    const texto = extrairTexto(msg)

    // envia video & apaga o buffer
    if (texto?.includes('tiktok.com')) {
      const caminhoVideo = path.join(__dirname, `tiktok_${Date.now()}.mp4`);
      try {
        const buffer = await downloadTikTok(texto);
        fs.writeFileSync(caminhoVideo, buffer)
        await  sock.sendMessage(from, {
          video: fs.readFileSync(caminhoVideo),
          mimetype: 'video/mp4',
          caption: ''
        })
      } catch (err) {
        await sock.sendMessage(from, {
          react: {
            text: '❌',
            key: msg.key
          }
        })
      } finally {
        if (fs.existsSync(caminhoVideo)) fs.unlinkSync(caminhoVideo);
      }
      return;
    }

    if (texto === '/ping') {
      const start = Date.now()
      await sock.sendMessage(from, {
        react: {
          text: '✅',
          key: msg.key
        }
      })
      const pingo = Date.now() - start
      await sock.sendMessage(from, {
       text: `🚩 ${pingo}ms`,
      })
    }

    if (texto?.startsWith('/tts ')) {
      const frase = texto.replace('/tts ', '');
      try {
        const caminho = await textToSpeech(frase);
        await sock.sendMessage(from, {
            audio: fs.readFileSync(caminho),
            mimetype: 'audio/mp3',
            ptt: true // aparece como mensagem de voz
        });
      } catch (err) {
        await sock.sendMessage(from, { text: 'Erro no TTS.' });
      } finally {
        if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
      }
      return;
    }

    if (!texto) return
    if (msg.key.fromMe && !texto.includes('tiktok.com')) return
  })
}


app.get('/', (req, res) => {
  res.send('Hello World!')
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
iniciarBot()
