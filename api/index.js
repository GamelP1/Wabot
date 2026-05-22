const RAPID_API_KEY = 'a9362214f1msh800f35c52da09b4p153459jsn029860f086c9'

async function pegarVideoTikTok(link) {
  try {
    const encodedParams = new URLSearchParams()

    encodedParams.set('url', link)
    encodedParams.set('hd', '1')

    const response = await axios.request({
      method: 'POST',
      url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/',
      headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host':
          'tiktok-video-no-watermark2.p.rapidapi.com',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: encodedParams
    })

    return {
      ok: true,
      url: response.data?.data?.play
    }

  } catch (err) {
    return {
      ok: false,
      status: err.response?.status || 500
    }
  }
}



if (
      texto.includes('vt.tiktok.com') ||
      texto.includes('vm.tiktok.com') ||
      texto.includes('tiktok.com')
    ) {
      await sock.sendMessage(from, {
        text: 'baixando...'
      })

      const videoUrl = await pegarVideoTikTok(texto)

      if (!videoUrl.ok) {

        if (videoUrl.status === 429) {
          await sock.sendMessage(from, {
            text: 'Limite atingido, máximo 150 por mês.'
          })

        } else {
          await sock.sendMessage(from, {
            text: `Erro na API (${videoUrl.status})`
          })
        }
        return
      }

      await sock.sendMessage(from, {
        video: { url: videoUrl },
        caption: ''
      })
    }

