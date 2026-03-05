// En tu archivo de comando: src/plugins/ai_nanobanana.js (o similar)
import { ... } from '../src/libraries/nanobanana.js'
const handler = async (m, { conn, text, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mediaType || '';

  if (!/image/g.test(mime)) throw `*❌ Debes responder a una imagen*`;
  if (!text) throw `*❌ Escribe un prompt para editar*\n\nEj: \`${usedPrefix + command} estilo anime\``;

  const data = await q.download?.();
  if (!data || data.length === 0) throw `*❌ No se pudo descargar la imagen*`;

  try {
    await conn.sendPresenceUpdate('composing', m.chat);
    console.log(`🎨 Procesando: "${text}"`);
    
    // ✅ Llamada compatible
    const resultBuffer = await img2img(data, text, {
      pollTimeout: 3 * 60 * 1000, // 3 minutos
      styleId: "realistic"
    });

    await conn.sendMessage(m.chat, { 
      image: resultBuffer, 
      caption: `✅ *Listo*\n📝 ${text}\n🖼️ NanoBanana`
    }, { quoted: m });

  } catch (error) {
    console.error('❌ Error nanobanana:', error.message);
    
    if (error.message.includes('nanobanana.ai') || error.message.includes('EAI_AGAIN')) {
      throw `*🌐 El servicio NanoBanana no está disponible.*\nIntenta más tarde o contacta al admin.`;
    } else if (error.message.includes('Rate limit')) {
      throw `*🚫 Límite de solicitudes.*\nEspera ~1 minuto.`;
    } else {
      throw `*❌ Error: ${error.message}*`;
    }
  }
};

handler.help = ['nanobanana <prompt>'];
handler.tags = ['ai'];
handler.command = ['nanobanana', 'nanoedit'];
export default handler;
