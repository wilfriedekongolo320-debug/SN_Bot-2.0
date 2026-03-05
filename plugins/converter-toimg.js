import { webp2png } from '../src/libraries/webp2mp4.js';
import fs from 'fs'; // Asegúrate de tener esta importación

const handler = async (m, { conn, usedPrefix, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.language;
  
  // Ajuste de ruta de traducción si es necesario
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.convertidor_toimg;

  const notStickerMessage = `*${tradutor.texto1} ${usedPrefix + command}*`;
  
  if (!m.quoted) throw notStickerMessage;
  
  const q = m.quoted || m;
  const mime = q.mediaType || '';
  
  if (!/sticker/.test(mime)) throw notStickerMessage;
  
  const media = await q.download();
  
  // Conversión de sticker a imagen
  const out = await webp2png(media).catch((_) => null);
  
  if (!out) {
      // Si falla la conversión, podrías enviar un mensaje de error
      return m.reply('*[!] Error al convertir el sticker, intenta de nuevo.*');
  }

  /* SOLUCIÓN AL ERROR:
     1. Usamos '' en lugar de null para evitar el error de match() en resolveMentions.
     2. Verificamos que la carpeta tmp exista antes de enviar.
  */
  const tmpDir = './tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  await conn.sendFile(m.chat, out, 'converted.png', '', m);
};

handler.help = ['toimg'];
handler.tags = ['converter'];
handler.command = ['toimg'];

export default handler;
