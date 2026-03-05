import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';
import { fileTypeFromBuffer } from 'file-type';

export default async (buffer) => {
  try {
    const fileInfo = await fileTypeFromBuffer(buffer);
    const ext = fileInfo?.ext || 'jpg';
    const mime = fileInfo?.mime || 'image/jpeg';

    const form = new FormData();
    // Aquí el cambio: Usamos el buffer directamente o lo convertimos a Uint8Array
    const blob = new Blob([Uint8Array.from(buffer)], { type: mime });
    
    form.append('fileToUpload', blob, `tmp.${ext}`);
    form.append('reqtype', 'fileupload');

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const result = await res.text(); 
    
    if (result.includes('https://files.catbox.moe/')) {
      return result.trim();
    } else {
      throw new Error('Catbox respondió: ' + result);
    }
  } catch (error) {
    console.error('❌ Error en Catbox Upload:', error);
    throw new Error('Error al subir imagen a Catbox: ' + error.message);
  }
};
