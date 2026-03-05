/**
// SunJinWoo - _antitrabas.js creado por SinNombre +5215629885039
// Plugin Anti-Trabas: Detecta mensajes largos (>5000 caracteres) y expulsa al usuario.
// Corregido: usar realJid, conn.groupParticipantsUpdate, y no enviar mensaje de error si es internal-server-error.
**/

import fs from 'fs';

export async function before(m, { conn, isAdmin, isBotAdmin, usedPrefix }) {
    const messages = {
        texto1: '⚠️ Eres admin, pero se detectó un mensaje largo.',
        texto2: '🚫 Mensaje con muchos caracteres detectado.',
        texto2_1: 'No soy admin, no puedo expulsar.',
        texto3: 'Usuario expulsado por enviar mensaje trabado.',
        texto3_1: 'Contacto',
        texto3_2: 'Nombre',
        texto3_3: 'Fue removido del grupo.',
        texto4: '⚠️ El modo restrict está desactivado, no puedo expulsar.'
    };

    if (m.isBaileys && m.fromMe) return true;
    if (!m.isGroup) return false;

    const chat = global.db.data.chats[m.chat];
    const bot = global.db.data.settings[this.user.jid] || {};

    if (chat.antiTraba && m.text && m.text.length > 5000) {
        const realJid = m.realSender || m.sender; // Usar JID real
        const name = await conn.getName(realJid) || 'Usuario';
        console.log(`Anti-Trabas activado para ${realJid}, longitud: ${m.text.length}`);

        if (isAdmin) {
            return conn.sendMessage(m.chat, { text: `${messages.texto1} @${realJid.split('@')[0]}`, mentions: [realJid] }, { quoted: m });
        }

        await conn.sendMessage(m.chat, { text: `${messages.texto2}${isBotAdmin ? '' : ` ${messages.texto2_1}`}` }, { quoted: m });

        if (isBotAdmin) {
            await conn.sendMessage(m.chat, { delete: m.key });

            setTimeout(() => {
                conn.sendMessage(m.chat, {
                    text: `${messages.texto3}\n=> ${messages.texto3_1} wa.me/${realJid.split('@')[0]}\n=> ${messages.texto3_2} ${name}\n${messages.texto3_3}`,
                    mentions: [realJid]
                }, { quoted: m });
            }, 1000);

            setTimeout(async () => {
                try {
                    console.log(`Intentando expulsar a ${realJid}`);
                    await conn.groupParticipantsUpdate(m.chat, [realJid], 'remove'); // Usar conn y realJid
                    console.log(`Expulsión exitosa para ${realJid}`);
                } catch (error) {
                    console.error('Error expulsando usuario en anti-trabas:', error);
                    // No enviar mensaje si es error de servidor
                    if (!error.message?.includes('internal-server-error')) {
                        await conn.sendMessage(m.chat, { text: 'Error al expulsar al usuario.' }, { quoted: m });
                    }
                }
            }, 2000);
        } else {
            return m.reply(messages.texto2_1);
        }
    }

    return true;
}
