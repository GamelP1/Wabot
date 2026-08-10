const { spawn, exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');

// Pega largura e altura do vídeo original
async function getVideoDimensions(inputPath) {
  const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`;
  const { stdout } = await execAsync(cmd);
  const [width, height] = stdout.trim().split('x').map(Number);
  return { width, height };
}

// Arredonda pra número par (libx264 exige dimensões pares)
function toEven(n) {
  return n % 2 === 0 ? n : n - 1;
}

function upscaleToHD(inputPath, targetLongSide = 1920) {
  return new Promise(async (resolve, reject) => {
    try {
      const { width, height } = await getVideoDimensions(inputPath);
      const longSide = Math.max(width, height);

      // Se já tá igual ou maior que o alvo, não faz upscale
      if (longSide >= targetLongSide) {
        return resolve(inputPath);
      }

      const scaleFactor = targetLongSide / longSide;
      const newWidth = toEven(Math.round(width * scaleFactor));
      const newHeight = toEven(Math.round(height * scaleFactor));

      const outputPath = inputPath.replace(/\.mp4$/, '_hd.mp4');

      const args = [
        '-i', inputPath,
        '-vf', `scale=${newWidth}:${newHeight}:flags=lanczos`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-c:a', 'copy',
        '-y', outputPath
      ];

      const ff = spawn('ffmpeg', args);
      let stderr = '';
      ff.stderr.on('data', (d) => (stderr += d.toString()));

      ff.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(new Error(`ffmpeg falhou (code ${code}): ${stderr.slice(-300)}`));
        }
      });

      ff.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { upscaleToHD };
