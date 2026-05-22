const express = require('express')
const app = express()
const port = process.env.PORT || 4000 
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const P = require('pino')
const axios = require('axios')

// converter link
async function resolverTikTok(url) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: () => true
    })
    return response.headers.location || null
  } catch (err) {
    console.error('Erro ao resolver TikTok:', err)
    return null
  }
}
async function obterVideoId(urlCurta) {
  const urlReal = await resolverTikTok(urlCurta)
  if (!urlReal) return null
  return urlReal.match(/\/video\/(\d+)/)?.[1] || null
}
// Converte link do TikTok em vídeo direto rapid
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
    // envia video
    const match = texto?.match(
      /https?:\/\/(?:vt|vm)\.tiktok\.com\/[^\s]+/i
    )
    if (match) {
      const id = await obterVideoId(match[0])
      console.log('ID do vídeo:', id)
      await sock.sendMessage(from, {
        video: { url: `https://www.tikwm.com/video/media/play/${id}.mp4` },
        caption: ''
      })
      return
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
       text: `🚩 ${pingo}ms \n> haro v0.10`
      })
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
