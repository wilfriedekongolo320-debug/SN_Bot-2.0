// SunJinWoo - _antitoxic.js creado por SinNombre +5215629885039
// Plugin Anti-Tóxico: Detecta palabras tóxicas, advierte y banea después de 3 warnings.

import fs from 'fs';

// Regex para detectar palabras tóxicas (case insensitive)
const toxicRegex = /\b(puto|puta|rata|estupido|idiota|imbecil|rctmre|mrd|verga|vrg|maricon|pendejo|pendeja)\b/i;

// Función principal del plugin
export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, participants }) {
    // Obtener configuración del chat
    const chat = global.db.data.chats[m.chat];
    if (!chat.antiToxic) return false; // Si no está activado, salir

    // Mensajes hardcodeados
    const messages = {
        texto1: "*[ ℹ️ ]*",
        texto1_1: "enviar la palabra",
        texto1_2: "está prohibido en este grupo.\n▢ *Advertencia:*",
        texto2: "*[ 🚫 ]* Usuario baneado:",
        texto2_1: "por exceder las advertencias de palabras tóxicas."
    };

    // Ignorar mensajes de Baileys o del propio bot
    if (m.isBaileys && m.fromMe) return true;
    if (!m.isGroup) return false; // Solo funciona en grupos

    // Obtener datos del usuario
    const user = global.db.data.users[m.sender];
    if (!user) return false; // Si no hay datos del usuario, salir

    // Verificar si el mensaje contiene palabras tóxicas
    const isToxic = toxicRegex.exec(m.text);
    if (isToxic && !isOwner && !isAdmin) {
        user.warn += 1; // Incrementar warnings

        if (user.warn < 3) { // 3 oportunidades
            // Enviar advertencia si no ha alcanzado 3 warnings
            const realJid = m.realSender || m.sender;
            const cleanNumber = realJid.split('@')[0].replace(/\+/g, '');
            const tag = `@${cleanNumber}`;
            try {
                await m.reply(
                    `${messages.texto1} ${tag}, ${messages.texto1_1} "${isToxic[0]}" ${messages.texto1_2} ${user.warn}/3*`,
                    false,
                    { mentions: [realJid] }
                );
            } catch (error) {
                console.error('Error enviando advertencia:', error);
            }
        }
    }

    // Si alcanza 3 warnings, banear y eliminar (lógica de _antilink)
    if (user.warn >= 3) {
        user.warn = 0; // Resetear warnings
        const realJid = m.realSender || m.sender;
        const cleanNumber = realJid.split('@')[0].replace(/\+/g, '');
        const tag = `@${cleanNumber}`;

        // Obtener LID del participante (como en _antilink)
        const senderClean = m.sender.split('@')[0];
        const found = participants.find(p => {
            const jN = (p.jid || '').split('@')[0];
            const lN = (p.lid || '').split('@')[0];
            return jN === senderClean || lN === senderClean;
        });
        const lidFull = found?.lid || null;

        const bot = global.db.data.settings[this.user.jid] || {};

        try {
            if (isBotAdmin) {
                // Eliminar mensaje y expulsar (como en _antilink)
                await conn.sendMessage(m.chat, { delete: m.key });
                try { await this.groupParticipantsUpdate(m.chat, [realJid], 'remove'); } catch {}
                if (lidFull) {
                    try { await this.groupParticipantsUpdate(m.chat, [lidFull], 'remove'); } catch {}
                }
                await m.reply(
                    `${messages.texto2} ${tag}, ${messages.texto2_1}`,
                    false,
                    { mentions: [realJid] }
                );
            } else {
                await m.reply(`🚫 ${tag} las palabras tóxicas no están permitidas. Serás marcado como baneado, pero no puedo expulsarte porque no soy admin.`, false, { mentions: [realJid] });
                console.log(`No se puede remover a ${m.sender} porque el bot no es admin.`);
            }
        } catch (error) {
            console.error('Error en eliminación/baneo:', error);
            // No enviar mensaje de error
        }

        user.banned = true; // Marcar como baneado
    }

    return false; // Continuar con el flujo normal
}
