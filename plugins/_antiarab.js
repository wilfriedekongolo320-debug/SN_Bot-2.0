/**
// SunJinWoo - _antiarab.js creado por SinNombre +5215629885039
**/

const BLOCKED_PREFIXES = [
  { prefixes: ['212'], msg: '🚫 Números de Marruecos no están permitidos.' },
  { prefixes: ['265'], msg: '🚫 Números de Malawi no están permitidos.' },
  { prefixes: ['92'], msg: '🚫 Números de Pakistán no están permitidos.' },
  { prefixes: ['234'], msg: '🚫 Números de Nigeria no están permitidos.' },
];

export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
  if (m.isBaileys && m.fromMe) return !0;
  if (!m.isGroup) return !1;

  const chat = global.db.data.chats[m.chat];
  const bot = global.db.data.settings[this.user.jid] || {};

  if (!isBotAdmin || !chat.antiArab2 || isAdmin || isOwner || isROwner || !bot.restrict) return !1;

  const { realJid, lidFull } = await getParticipantIds.call(this, m.chat, m.sender);
  const senderNumber = realJid.split('@')[0];

  for (const { prefixes, msg } of BLOCKED_PREFIXES) {
    if (prefixes.some(prefix => senderNumber.startsWith(prefix))) {
      try {
        await m.reply(msg);
        await conn.sendMessage(m.chat, { delete: m.key });
        await kickUser.call(this, m.chat, realJid, lidFull);
      } catch (e) {
        console.error('❌ Error _antiarab:', e.message);
      }
      return;
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
  // Intentar con JID real primero
  try {
    const r = await this.groupParticipantsUpdate(chatId, [realJid], 'remove');
    if (r[0]?.status !== '404') return;
  } catch {}
  // Si falla, intentar con LID@lid
  if (lidFull) {
    try {
      await this.groupParticipantsUpdate(chatId, [lidFull], 'remove');
    } catch {}
  }
}
