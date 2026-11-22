/* ⚡ ZAMAN AI ASSISTANT — CLEAN INTERACTIVE IMAGE CARD & BUTTON BUILDER ⚡ */

import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import config from '../config.js';

export async function createWelcomeCard(conn, userName = '', userJid = '') {
  const nameGreeting = userName ? ` ${userName}` : '';
  const owner = config.owner;

  const cardText = `Salam${nameGreeting}! Welcome to Zaman Haider's WhatsApp.

*Zaman Haider* — AI Automation Specialist
_Innovate • Automate • Scale_

🌐 *Website:* ${owner.portfolioUrl}
📧 *Email:* ${owner.email}

Please select an option below:`;

  const fallbackText = `${cardText}

1. 💬 Chat with Zaman: Reply "TALK TO ZAMAN"
2. ⚡ Services & Portfolio: Reply "SERVICES"`;

  const imagePath = path.resolve(owner.bannerImage || './assets/zaman_haider.jpg');
  let media = null;

  if (fs.existsSync(imagePath) && conn && conn.waUploadToServer) {
    try {
      media = await prepareWAMessageMedia(
        { image: fs.readFileSync(imagePath) },
        { upload: conn.waUploadToServer }
      );
    } catch (e) {
      console.warn('[CARD-BUILDER] Image media preparation failed:', e.message);
    }
  }

  const header = media?.imageMessage
    ? {
        title: "Zaman Haider | AI Automation Specialist",
        hasMediaAttachment: true,
        imageMessage: media.imageMessage
      }
    : {
        title: "Zaman Haider | AI Automation Specialist",
        hasMediaAttachment: false
      };

  const interactiveMessage = {
    body: { text: cardText },
    footer: { text: "Zaman Haider • Innovate • Automate • Scale" },
    header,
    nativeFlowMessage: {
      buttons: [
        // Dummy placeholder enables horizontal side-by-side alignment on WhatsApp
        {
          name: ""
        },
        // Button 1: Personal Chat directly with Zaman
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "💬 Chat with Zaman",
            id: "btn_personal_alert"
          })
        },
        // Button 2: Opens Services & Portfolio Menu
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "⚡ Services & Menu",
            id: "btn_services_menu"
          })
        }
      ],
      messageParamsJson: "{}"
    }
  };

  return {
    interactiveMessage,
    fallbackText,
    imagePath
  };
}

export async function createServicesMenu(conn) {
  const owner = config.owner;

  let body = `*Zaman Haider — Services & Portfolio*\n_Innovate • Automate • Scale_\n\n`;

  config.services.forEach((s, idx) => {
    body += `*${idx + 1}. ${s.title}*\n${s.desc}\n\n`;
  });

  body += `🌐 *Website:* ${owner.portfolioUrl}\n`;
  body += `💼 *WhatsApp Catalog:* ${owner.catalogUrl}\n\n`;
  body += `Reply with your project brief or budget to get started!`;

  const interactiveMessage = {
    body: { text: body },
    footer: { text: "Zaman Haider • AI Solutions & Autonomous Systems" },
    header: {
      title: "Services & Solutions Menu",
      hasMediaAttachment: false
    },
    nativeFlowMessage: {
      buttons: [
        // Button 1: Direct link to portfolio website in browser
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🌐 View Portfolio",
            url: owner.portfolioUrl,
            merchant_url: owner.portfolioUrl
          })
        },
        // Button 2: Direct link to WhatsApp Business Catalog
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "💼 WhatsApp Catalog",
            url: owner.catalogUrl,
            merchant_url: owner.catalogUrl
          })
        },
        // Button 3: Talk with Zaman directly
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "💬 Chat with Zaman",
            id: "btn_personal_alert"
          })
        }
      ],
      messageParamsJson: JSON.stringify({
        bottom_sheet: {
          in_thread_buttons_limit: 3
        }
      })
    }
  };

  return {
    interactiveMessage,
    fallbackText: body
  };
}

export async function sendInteractiveCard(conn, chatJid, cardData, quotedMsg) {
  try {
    const msg = generateWAMessageFromContent(
      chatJid,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: cardData.interactiveMessage
          }
        }
      },
      {
        userJid: conn.user?.jid || conn.user?.id,
        quoted: quotedMsg
      }
    );

    await conn.relayMessage(chatJid, msg.message, { messageId: msg.key.id });
    return true;
  } catch (err) {
    console.error('[CARD-BUILDER-ERROR] Relay failed, sending text fallback:', err.message);
    if (cardData.imagePath && fs.existsSync(cardData.imagePath)) {
      await conn.sendMessage(chatJid, { image: fs.readFileSync(cardData.imagePath), caption: cardData.fallbackText }, { quoted: quotedMsg });
    } else {
      await conn.sendMessage(chatJid, { text: cardData.fallbackText }, { quoted: quotedMsg });
    }
    return false;
  }
}

export default {
  createWelcomeCard,
  createServicesMenu,
  sendInteractiveCard
};
