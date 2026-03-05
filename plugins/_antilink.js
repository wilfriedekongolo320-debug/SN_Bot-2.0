/**
// SunJinWoo - _antilink.js creado por SinNombre +5215629885039
**/

const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;

export async function before(m, { conn, isAdmin, isBotAdmin, participants }) {
  if (m.isBaileys && m.fromMe) return !0;
  if (!m.isGroup) return !1;
  if (!m.text) return !0;

  const chat = global.db.data.chats[m.chat];
  if (!chat?.antiLink) return !0;

  const bot = global.db.data.settings[this.user.jid] || {};
  const isGroupLink = linkRegex.exec(m.text);
  const grupo = 'https://chat.whatsapp.com';

  // JID real resuelto desde handler.js
  const realJid = m.realSender || m.sender;
  const tag = `@${realJid.split('@')[0]}`;

  // Obtener LID@lid del participante
  const senderClean = m.sender.split('@')[0];
  const found = participants.find(p => {
    const jN = (p.jid || '').split('@')[0];
    const lN = (p.lid || '').split('@')[0];
    return jN === senderClean || lN === senderClean;
  });
  const lidFull = found?.lid || null;

  // Si es admin y envía link, solo avisar
  if (isAdmin && m.text.includes(grupo)) {
    return this.sendMessage(m.chat, {
      text: `⚠️ ${tag} eres admin, pero se detectó un enlace de grupo.`,
      mentions: [realJid]
    }, { quoted: m });
  }

  // Si NO es admin y envía link de grupo
  if (isGroupLink && !isAdmin) {
    if (isBotAdmin) {
      try {
        const linkThisGroup = `https://chat.whatsapp.com/${await this.groupInviteCode(m.chat)}`;
        if (m.text.includes(linkThisGroup)) return !0;
      } catch {}
    }

    await this.sendMessage(m.chat, {
      text: `🚫 ${tag} los enlaces de grupo no están permitidos. Serás expulsado.`,
      mentions: [realJid]
    }, { quoted: m });

    if (!isBotAdmin) return m.reply('⚠️ No soy admin, no puedo expulsar.');

    if (isBotAdmin && bot.restrict) {
      await conn.sendMessage(m.chat, { delete: m.key });
      try { await this.groupParticipantsUpdate(m.chat, [realJid], 'remove'); } catch {}
      if (lidFull) {
        try { await this.groupParticipantsUpdate(m.chat, [lidFull], 'remove'); } catch {}
      }
    } else if (!bot.restrict) {
      return m.reply('⚠️ El modo restrict está desactivado, no puedo expulsar.');
    }
  }
  return !0;
}
