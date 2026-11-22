/* ⚡ ZAMAN AI ASSISTANT — MESSAGE SERIALIZER & UNWRAPPER ⚡ */

import { downloadContentFromMessage, extractMessageContent, getContentType, jidNormalizedUser } from '@whiskeysockets/baileys';

export function smsg(conn, m) {
  if (!m) return m;

  if (m.key) {
    m.id = m.key.id;
    m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat.endsWith('@g.us');
    m.isChannel = m.chat.endsWith('@newsletter');
    m.isLid = m.chat.endsWith('@lid') || (m.key.participant || '').endsWith('@lid');
    const rawSender = m.fromMe ? (conn.user?.id || conn.user?.jid) : (m.key.participant || m.chat);
    m.sender = rawSender ? jidNormalizedUser(rawSender) : '';
  }

  if (m.message) {
    let raw = extractMessageContent(m.message) || m.message;

    // Handle viewOnceMessage
    if (raw.viewOnceMessage || raw.viewOnceMessageV2) {
      raw = extractMessageContent(raw.viewOnceMessage?.message || raw.viewOnceMessageV2?.message) || raw;
    }

    m.mtype = getContentType(raw) || Object.keys(raw)[0];
    m.msg = raw[m.mtype] || raw;

    // Extract text from all message variations
    let text = '';
    if (raw.conversation) {
      text = raw.conversation;
    } else if (raw.extendedTextMessage?.text) {
      text = raw.extendedTextMessage.text;
    } else if (raw.imageMessage?.caption) {
      text = raw.imageMessage.caption;
    } else if (raw.videoMessage?.caption) {
      text = raw.videoMessage.caption;
    } else if (raw.interactiveResponseMessage) {
      const resp = raw.interactiveResponseMessage;
      try {
        const nativeParams = JSON.parse(resp.nativeFlowResponseMessage?.paramsJson || '{}');
        text = nativeParams.id || resp.nativeFlowResponseMessage?.name || '';
      } catch (e) {
        text = resp.nativeFlowResponseMessage?.name || '';
      }
    } else if (raw.buttonsResponseMessage) {
      text = raw.buttonsResponseMessage.selectedButtonId || raw.buttonsResponseMessage.selectedDisplayText || '';
    } else if (raw.templateButtonReplyMessage) {
      text = raw.templateButtonReplyMessage.selectedId || raw.templateButtonReplyMessage.selectedDisplayText || '';
    } else if (raw.listResponseMessage) {
      text = raw.listResponseMessage.singleSelectReply?.selectedRowId || '';
    }

    m.text = text;

    // Quoted message unwrapping
    const contextInfo = m.msg?.contextInfo;
    if (contextInfo?.quotedMessage) {
      let qRaw = extractMessageContent(contextInfo.quotedMessage) || contextInfo.quotedMessage;
      if (qRaw.viewOnceMessage || qRaw.viewOnceMessageV2) {
        qRaw = extractMessageContent(qRaw.viewOnceMessage?.message || qRaw.viewOnceMessageV2?.message) || qRaw;
      }
      const qType = getContentType(qRaw) || Object.keys(qRaw)[0];
      const qMsg = qRaw[qType] || qRaw;

      const myJid = jidNormalizedUser(conn.user?.jid || conn.user?.id || '');
      const quotedParticipant = contextInfo.participant ? jidNormalizedUser(contextInfo.participant) : undefined;
      m.quoted = {
        key: {
          remoteJid: m.chat,
          fromMe: quotedParticipant === myJid,
          id: contextInfo.stanzaId,
          participant: quotedParticipant
        },
        message: qRaw,
        mtype: qType,
        msg: qMsg,
        text: qMsg?.text || qMsg?.caption || qRaw?.conversation || '',
        download: async () => {
          const stream = await downloadContentFromMessage(qMsg, qType.replace('Message', ''));
          let buffer = Buffer.from([]);
          for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          return buffer;
        }
      };
    }

    // Media download helper
    m.download = async () => {
      if (!m.msg) return null;
      const type = m.mtype.replace('Message', '');
      const stream = await downloadContentFromMessage(m.msg, type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      return buffer;
    };
  }

  return m;
}

export default {
  smsg
};
