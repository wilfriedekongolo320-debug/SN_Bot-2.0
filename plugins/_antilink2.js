/**
// SunJinWoo - _antilink2.js creado por SinNombre +5215629885039
// Bloquea TODOS los links excepto YouTube y el link del grupo
**/

const linkRegex = /https?:\/\//i;

const ALLOWED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'www.youtube.com',
];

export async function before(m, { conn, isAdmin, isBotAdmin }) {
  if (m.isBaileys && m.fromMe) return !0;
  if (!m.isGroup) return !1;
  if (!m.text) return !0;

  const chat = global.db.data.chats[m.chat];
  if (!chat?.antiLink2) return !0;

  const bot = global.db.data.settings[this.user.jid] || {};
  const isLink = linkRegex.exec(m.text);

  if (isLink && !isAdmin) {
    if (isBotAdmin) {
      try {
        const linkThisGroup = `https://chat.whatsapp.com/${await this.groupInviteCode(m.chat)}`;
        if (m.text.includes(linkThisGroup)) return !0;
      } catch {}

      if (ALLOWED_DOMAINS.some(domain => m.text.includes(domain))) return !0;
    }

    const { realJid, lidFull } = await getParticipantIds.call(this, m.chat, m.sender);
    const tag = `@${realJid.split('@')[0]}`;

    await this.sendMessage(m.chat, {
      text: `🚫 ${tag} los enlaces no están permitidos aquí.`,
      mentions: [realJid]
    }, { quoted: m });

    if (!isBotAdmin) return m.reply('⚠️ No soy admin, no puedo expulsar.');

    if (isBotAdmin && bot.restrict) {
      await conn.sendMessage(m.chat, { delete: m.key });
      await kickUser.call(this, m.chat, realJid, lidFull);
    } else if (!bot.restrict) {
      return m.reply('⚠️ El modo restrict está desactivado, no puedo expulsar.');
    }
  }
  return !0;
}

async function getParticipantIds(chatId, senderJid) {
  try {
    const groupMeta = await this.groupMetadata(chatId);
    const senderNum = senderJid.split('@')[0];
    const found = groupMeta.participants.find(p => {
      const jidNum = (p.jid || p.id || '').split('@')[0];
      const lidNum = (p.lid || '').split('@')[0];
      return jidNum === senderNum || lidNum === senderNum;
    });
    return {
      realJid: found?.jid || found?.id || senderJid,
      lidFull: found?.lid || null
    };
  } catch {
    return { realJid: senderJid, lidFull: null };
  }
}

async function kickUser(chatId, realJid, lidFull) {
  try {
    const r = await this.groupParticipantsUpdate(chatId, [realJid], 'remove');
    if (r[0]?.status !== '404') return;
  } catch {}
  if (lidFull) {
    try {
      await this.groupParticipantsUpdate(chatId, [lidFull], 'remove');
    } catch {}
  }
}
