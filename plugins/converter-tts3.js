import fetch from 'node-fetch';

// Tu API Key de ElevenLabs
const apiKey = 'a0e2c6022f1aeb28b5020b1dd0faf6ee';

const handler = async (m, { conn, usedPrefix, command, text }) => {
  // 1. Extraer voz y texto (Soporta nombres con espacios como 'Fernando Martinez')
  const match = text.match(/^([^|]+)\s*\|\s*(.+)/i);
  
  if (!match) {
    const voicesData = await getVoices();
    if (!voicesData || !voicesData.voices) return m.reply('*[❗] Error al conectar con la API de ElevenLabs.*');
    
    // Mostramos solo el primer nombre de cada voz para que sea más fácil de usar
    const voiceList = voicesData.voices.map(v => v.name.split(' - ')[0]).join('\n◉ ');
    return m.reply(`*[❗] Formato incorrecto.*\n\n*—◉ Uso:*\n◉ ${usedPrefix + command} nombre_voz | texto\n\n*—◉ Ejemplo:*\n◉ ${usedPrefix + command} Roger | Hola, ¿cómo estás?\n\n*—◉ Voces disponibles (puedes usar el primer nombre):*\n◉ ${voiceList}`);
  }

  let [, voiceName, inputText] = match;
  voiceName = voiceName.trim().toLowerCase();
  
  const voicesData = await getVoices();
  if (!voicesData || !voicesData.voices) return m.reply('*[❗] No se pudo obtener la lista de voces.*');

  // 2. Búsqueda inteligente: Busca si el nombre ingresado está contenido en el nombre de la API
  const voice = voicesData.voices.find(v => 
    v.name.toLowerCase().includes(voiceName) || 
    v.name.toLowerCase().split(' ')[0] === voiceName
  );

  if (!voice) {
    const voiceList = voicesData.voices.map(v => v.name.split(' - ')[0]).join(', ');
    return m.reply(`*[❗] La voz "${voiceName}" no existe.*\n\n*Prueba con:*\n${voiceList}`);
  }

  // 3. Generar el audio
  try {
    // Feedback visual (opcional)
    if (m.react) m.react('🗣️');
    
    const audioBuffer = await convertTextToSpeech(inputText, voice.voice_id);

    if (audioBuffer) {
      await conn.sendMessage(m.chat, { 
        audio: audioBuffer, 
        fileName: `tts_${voiceName}.mp3`, 
        mimetype: 'audio/mpeg', 
        ptt: true 
      }, { quoted: m });
    } else {
      throw new Error('No se generó el buffer de audio');
    }
  } catch (e) {
    console.error(e);
    m.reply('*[❗] Error al generar el audio. Revisa si te quedan caracteres en ElevenLabs.*');
  }
};

handler.help = ['tts3'];
handler.tags = ['converter'];
handler.command = ['tts3'];

export default handler;

// --- Funciones de comunicación con la API ---

async function getVoices() {
  const url = 'https://api.elevenlabs.io/v1/voices';
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'xi-api-key': apiKey }
    });
    return await response.json();
  } catch (error) {
    console.error('Error Voices:', error);
    return null;
  }
}

async function convertTextToSpeech(text, voiceId) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2', // Mejor calidad en español
        voice_settings: { 
          stability: 0.5, 
          similarity_boost: 0.75 
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return null;
    }

    return await response.buffer();
  } catch (error) {
    console.error('Error TTS:', error);
    return null;
  }
}
