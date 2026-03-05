import { search, download } from 'aptoide-scraper';
import fs from 'fs';

const handler = async (m, { conn, usedPrefix: prefix, command, text }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.downloader_modapk;

  if (!text) throw `${tradutor.texto1}`;

  try {
    // 1. Buscar la aplicación
    const searchA = await search(text);
    if (!searchA.length) throw 'No se encontró la aplicación.';
    const data5 = await download(searchA[0].id);

    // 2. Información técnica del APK
/*    let response = `*┏━━━━━━━━━━━━━━━━┓*\n` +
                   `*┃ 📥 DESCARGADOR APK ┃*\n` +
                   `*┗━━━━━━━━━━━━━━━━┛*\n\n` +
                   `*📦 Nombre:* ${data5.name}\n` +
                   `*🆔 Paquete:* ${data5.package}\n` +
                   `*🗓️ Actualizado:* ${data5.lastup}\n` +
                   `*⚖️ Tamaño:* ${data5.size}`;
  */
  // 2. Información técnica del APK
let response = 
`━━━〔 📥 DESCARGA APK〕━━━\n\n` +
`*▸ 📦 App* : ${data5.name}\n` +
`*▸ 🆔 ID* : ${data5.package}\n` +
`*▸ 🗓️ Update* : ${data5.lastup}\n` +
`▸ ⚖️ *Peso* : ${data5.size}\n\n` +
`━━━━━━━━━━━━━━━━━━━━`;

    // 3. Enviar miniatura con la info
    await conn.sendMessage(m.chat, { image: { url: data5.icon }, caption: response }, { quoted: m });

    // 4. Validación de tamaño (Límite de 1GB para evitar errores de memoria)
    if (data5.size.includes('GB') || parseFloat(data5.size.replace(' MB', '')) > 999) {
      return await conn.sendMessage(m.chat, { text: `${tradutor.texto3}` }, { quoted: m });
    }

    // 5. MENSAJE DE ESPERA (AQUÍ SE AGREGA)
    await conn.sendMessage(m.chat, { text: `⏳ *Descargando "${data5.name}"...* Por favor, espera un momento.` }, { quoted: m });

    // 6. ENVIAR EL ARCHIVO APK FINAL
    await conn.sendMessage(m.chat, { 
      document: { url: data5.dllink }, 
      mimetype: 'application/vnd.android.package-archive', 
      fileName: `${data5.name}.apk`, 
      caption: `✅ *Aquí tienes tu aplicación:* ${data5.name}` 
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    // Si hay un error específico en la traducción lo lanza, si no, un mensaje genérico
    throw tradutor.texto4 || 'Ocurrió un error inesperado al descargar.';
  }
};

handler.help = ['apk'];
handler.tags = ['search'];
handler.command = /^(apk|apkmod|modapk|dapk2|aptoide|aptoidedl)$/i;

export default handler;
