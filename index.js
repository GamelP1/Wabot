console.log("Bot iniciando...");

const express = require("express")
const app = express()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const qrcode = require('qrcode-terminal')
const P = require('pino')
const axios = require('axios')

const RAPID_API_KEY = 'a9362214f1msh800f35c52da09b4p153459jsn029860f086c9'

// Converte link do TikTok em vídeo direto
async function pegarVideoTikTok(link) {
  try {
    const response = await axios.get(
      'https://tiktok-video-no-watermark2.p.rapidapi.com/',
      {
        params: { url: link, hd: '1' },
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host':
            'tiktok-video-no-watermark2.p.rapidapi.com'
        }
      }
    )

    return response.data?.data?.play || null
  } catch (err) {
    console.log('Erro API:', err.message)
    return null
  }
}

// Extrai texto de qualquer tipo de mensagem
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

  console.log('Versão WA:', version)

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
      console.log('Conectando...')
    }

    if (connection === 'open') {
      console.log('Bot conectado com sucesso!')
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

    console.log('Mensagem:', texto)
    if (texto === '/outbot') {
      await sock.sendMessage(from, {
       text: 'Até breve, graciosamente:\n> haro v0.10'
      })
      //process.exit(0)
    }
    if (!texto) return

    // Anti-loop
    if (msg.key.fromMe && !texto.includes('tiktok.com')) return

    // Detecta TikTok
    if (
      texto.includes('vt.tiktok.com') ||
      texto.includes('vm.tiktok.com') ||
      texto.includes('tiktok.com')
    ) {
      await sock.sendMessage(from, {
        text: 'waiting for data...'
      })

      const videoUrl = await pegarVideoTikTok(texto)

      if (!videoUrl) {
        return
      }

      await sock.sendMessage(from, {
        video: { url: videoUrl },
        caption: ''
      })
    }
  })
}

iniciarBot()

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Servidor web ligado")
})

app.get("/", (req, res) => {
  res.send("Bot online")
})

app.listen(3000)
