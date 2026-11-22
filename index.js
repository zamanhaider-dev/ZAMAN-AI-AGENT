/* ⚡ ZAMAN HAIDER — EXECUTIVE AI BUSINESS ASSISTANT ENGINE ⚡ */

import './config.js';
import config from './config.js';
import crm from './lib/leadCrm.js';
import { createWelcomeCard, createServicesMenu, sendInteractiveCard } from './lib/cardBuilder.js';
import { generateAiReply, transcribeAudio } from './lib/aiEngine.js';
import { handleOwnerCommand } from './lib/ownerControls.js';
import { initScheduler } from './lib/scheduler.js';
import { simulateHumanInteraction, randomJitter } from './lib/antiBan.js';
import { smsg } from './lib/simple.js';

import cfonts from 'cfonts';
import chalk from 'chalk';
import QRCode from 'qrcode';
import pino from 'pino';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} from '@whiskeysockets/baileys';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 1. Startup Banner
console.clear();
cfonts.say('ZAMAN AI', {
  font: 'block',
  align: 'center',
  gradient: ['cyan', 'magenta']
});

cfonts.say('Executive WhatsApp Business Assistant', {
  font: 'console',
  align: 'center',
  gradient: ['yellow', 'white']
});

console.log(chalk.bold.cyan(`\n⚡ Version: ${config.assistant.version} | Master: ${config.owner.name} (${config.owner.number})\n`));

async function startAgent() {
  const sessionDir = path.resolve(config.sessionsDir);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  let opcion = '';
  const credsExist = fs.existsSync(path.join(sessionDir, 'creds.json'));

  const methodCodeQR = process.argv.includes('qr');
  const methodCode = process.argv.includes('code');

  if (methodCodeQR) opcion = '1';
  else if (methodCode) opcion = '2';

  if (!credsExist && !methodCodeQR && !methodCode) {
    do {
      opcion = await question(
        chalk.bold.white("\n⚡ Select Connection Method:\n") +
        chalk.bold.blueBright("  [1] Scan QR Code (WhatsApp Web style)\n") +
        chalk.bold.cyan("  [2] Enter 8-Digit Pairing Code (Phone number style)\n") +
        chalk.bold.greenBright("--> ")
      );
      if (!/^[1-2]$/.test(opcion)) {
        console.log(chalk.bold.redBright("⚠️ Invalid choice. Enter 1 or 2."));
      }
    } while (opcion !== '1' && opcion !== '2');
  }

  const conn = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
    },
    browser: ["Windows", "Chrome", "131.0.6778.86"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
    shouldIgnoreJid: jid => (typeof jid === 'string' && (jid.endsWith('@newsletter') || jid.endsWith('@lid')))
  });

  // Track all messages dispatched by the bot to prevent self-triggering loops
  const botSentIds = new Set();

  const originalSendMessage = conn.sendMessage.bind(conn);
  conn.sendMessage = async (...args) => {
    const res = await originalSendMessage(...args);
    if (res?.key?.id) {
      botSentIds.add(res.key.id);
      if (botSentIds.size > 300) {
        const first = botSentIds.values().next().value;
        botSentIds.delete(first);
      }
    }
    return res;
  };

  const originalRelayMessage = conn.relayMessage.bind(conn);
  conn.relayMessage = async (jid, message, options = {}) => {
    if (options.messageId) {
      botSentIds.add(options.messageId);
      if (botSentIds.size > 300) {
        const first = botSentIds.values().next().value;
        botSentIds.delete(first);
      }
    }
    return await originalRelayMessage(jid, message, options);
  };

  conn.ev.on('creds.update', saveCreds);

  // Pairing code flow
  if (!credsExist && opcion === '2') {
    let phoneNumber = config.owner.number;
    const inputNum = await question(chalk.bold.greenBright(`\n📱 Enter WhatsApp Number (Press ENTER for default +${config.owner.number}):\n${chalk.bold.cyan('--> ')}`));
    phoneNumber = inputNum.replace(/\D/g, '') || config.owner.number;

    setTimeout(async () => {
      try {
        let code = await conn.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;

        console.log(chalk.bold.cyanBright(`\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮`));
        console.log(chalk.bold.cyanBright(`┃         ⚡ ZAMAN AI PAIRING CODE ⚡          ┃`));
        console.log(chalk.bold.cyanBright(`╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n`));
        console.log(chalk.bold.greenBright(`🔑 Code: `) + chalk.bold.black.bgWhite(` ${code} `) + '\n');
        console.log(chalk.white(`📱 In WhatsApp on your phone:`));
        console.log(chalk.white(`   1. Settings > Linked Devices`));
        console.log(chalk.white(`   2. Tap "Link a Device" > "Link with phone number instead"`));
        console.log(chalk.white(`   3. Enter this code: ${code}\n`));
      } catch (err) {
        console.error('Failed to get pairing code:', err.message);
      }
    }, 3000);
  }

  // Connection Update Event
  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Render visual QR Code cleanly
    if (qr && (opcion === '1' || methodCodeQR)) {
      try {
        const qrString = await QRCode.toString(qr, { type: 'terminal', small: true });
        console.clear();
        console.log(chalk.bold.cyanBright(`\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮`));
        console.log(chalk.bold.cyanBright(`┃            ⚡ ZAMAN AI QR CODE LOGIN ⚡             ┃`));
        console.log(chalk.bold.cyanBright(`╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n`));
        console.log(qrString);
        console.log(chalk.bold.greenBright(`\n📱 Point WhatsApp camera at the QR code above to link!`));
        console.log(chalk.white(`   Settings > Linked Devices > Link a Device\n`));
      } catch (e) {
        console.error('QR Render Error:', e.message);
      }
    }

    if (connection === 'open') {
      const userJid = jidNormalizedUser(conn.user.id);
      const userName = conn.user.name || conn.user.verifiedName || config.owner.name;

      console.log(chalk.bold.greenBright(`\n✅ [ZAMAN AI] Connected Successfully to: ${userName} (${userJid})`));
      console.log(chalk.bold.cyan(`🛡️ Executive 24/7 AI Office is active and protecting your chats.\n`));

      // Auto-sync groups into CRM
      try {
        const parts = await conn.groupFetchAllParticipating().catch(() => ({}));
        const myId = userJid.split('@')[0];
        for (const [jid, meta] of Object.entries(parts)) {
          const isBotAdmin = (meta.participants || []).some(
            p => p.id.replace(/\D/g, '').startsWith(myId) && (p.admin === 'admin' || p.admin === 'superadmin')
          );
          crm.saveGroup(jid, {
            subject: meta.subject,
            size: meta.participants?.length || 0,
            owner: meta.owner || '',
            creation: meta.creation || null,
            isBotAdmin
          });
        }
      } catch (e) {}

      // Start background task & reminder scheduler
      initScheduler(conn);

      // Send clean online status message to Zaman Haider
      try {
        const cleanConnected = userJid.replace(/[^0-9]/g, '');
        const welcomeText = `🟢 *Zaman AI Assistant is ONLINE*
Master: ${config.owner.name} (+${cleanConnected})

Auto-management active:
• First-time contacts receive welcome card with Portfolio, Catalog & Direct Chat.
• Client inquiries handled with AI auto-replies.

*Available Controls (Voice or Text):*
• 🎙️ *Voice Notes:* Send audio commands in Roman Urdu or English!
• ⏰ *Reminders:* "10 bjy yaad dilwana: <task>" / "remind me in 30 mins: <task>"
• 📝 *Tasks:* "add task: <text>" / "tasks" / "done task <id>"
• 📌 *Notes:* "add note: <text>" / "notes"
• 🚫 *Block / Unblock:* "unblock <phone>" / "block <phone>"
• 🔒 *Silent Groups:* "mute group" / "unmute group" (silent emoji reactions)
• 👥 *CRM:* "leads" / "groups"
• 🤖 *AI Config:* "ai config" / "show prompt" / "set prompt: <text>"

Type *status* or *leads* anytime.`;

        await conn.sendMessage(userJid, { text: welcomeText });
      } catch (e) {
        console.error('[ONLINE-ALERT-ERROR]', e.message);
      }
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.bold.redBright(`\n⚠️ [ZAMAN AI] Session was logged out on the phone.`));
        console.log(chalk.bold.yellowBright(`🧹 Auto-clearing session folder...`));
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {}
        console.log(chalk.bold.greenBright(`✅ Session cleared. Restart with 'npm start' to link fresh.\n`));
        process.exit(0);
      } else if (reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost || reason === DisconnectReason.restartRequired || reason === DisconnectReason.timedOut) {
        console.log(chalk.bold.yellow(`\n♻️ Connection interrupted (${reason}). Reconnecting in 3s...`));
        setTimeout(startAgent, 3000);
      } else {
        console.log(chalk.bold.yellow(`\n⚠️ Disconnected (${reason}). Reconnecting...`));
        setTimeout(startAgent, 3000);
      }
    }
  });

  // Message Handler
  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;

    for (let rawMsg of messages) {
      if (!rawMsg.message) continue;
      const m = smsg(conn, rawMsg);

      // CRITICAL: Never process messages dispatched by the bot itself (prevents infinite echo loops)
      if (botSentIds.has(m.id) || m.isBaileys) continue;

      const senderNumber = (m.sender || '').split('@')[0].replace(/[^0-9]/g, '');
      const ownerNumber = config.owner.number.replace(/[^0-9]/g, '');
      const isOwner = m.fromMe || senderNumber === ownerNumber;

      // Handle Voice Notes / Audio Commands from Zaman Haider
      const isAudio = m.mtype === 'audioMessage' || !!rawMsg.message?.audioMessage;
      if (isAudio && isOwner) {
        try {
          console.log(chalk.bold.cyan(`🎙️ [VOICE COMMAND] Processing audio from Zaman Haider...`));
          const audioBuffer = await m.download();
          if (audioBuffer && audioBuffer.length > 0) {
            const mime = (rawMsg.message.audioMessage || {}).mimetype || 'audio/ogg; codecs=opus';
            const transcription = await transcribeAudio(audioBuffer, mime);

            if (transcription) {
              console.log(chalk.bold.greenBright(`🎙️ [VOICE TRANSCRIBED]: "${transcription}"`));
              // Acknowledge voice command with reaction
              await conn.sendMessage(m.chat, { react: { text: '🎙️', key: m.key } });
              m.text = transcription;
              m.isVoiceCommand = true;
            } else {
              await conn.sendMessage(m.chat, {
                text: `🎙️ _Voice note received. To enable speech recognition, please configure your Gemini or Groq key:_\n"set gemini key: <key>"`
              }, { quoted: m });
              continue;
            }
          }
        } catch (vErr) {
          console.error('[VOICE-ERROR]', vErr.message);
        }
      }

      if (!m.text && !m.quoted) continue;

      // 1. MASTER CONTROLS (Prefix-less commands for Zaman Haider)
      if (isOwner) {
        const handled = await handleOwnerCommand(m, conn);
        if (handled) continue;
      }

      // Ignore channels (@newsletter), broadcasts, and LID internal devices
      if (
        !m.chat ||
        m.chat.endsWith('@newsletter') ||
        m.chat === 'status@broadcast' ||
        m.chat.endsWith('@lid') ||
        m.sender?.endsWith('@lid')
      ) {
        continue;
      }

      // Record group activity in CRM and ignore for customer auto-consultation
      if (m.isGroup) {
        crm.saveGroup(m.chat, {});
        continue;
      }

      // Ignore messages sent by bot to avoid loops
      if (m.fromMe) continue;

      const userText = (m.text || '').trim();
      const lowerText = userText.toLowerCase();

      // 2. CHECK INTERACTIVE BUTTON ACTIONS
      // Button 3: Talk to Zaman Directly (Personal / Direct Chat)
      if (
        lowerText === 'btn_personal_alert' ||
        lowerText.includes('talk to zaman') ||
        lowerText.includes('chat with zaman') ||
        lowerText.includes('personal chat') ||
        lowerText.includes('speak with zaman')
      ) {
        const clientName = m.pushName || 'Client';
        const clientPhone = senderNumber;

        // Acknowledge the user
        await conn.sendMessage(m.chat, {
          text: `Message delivered to Zaman Haider. He will get back to you shortly.\n\nYou can also leave your message or project brief here in the meantime.`
        }, { quoted: m });

        // Dispatch Alert to Zaman Haider's WhatsApp
        const ownerJid = `${ownerNumber}@s.whatsapp.net`;
        const alertMsg = `🔔 *Direct Chat Request*
Contact: ${clientName} (+${clientPhone})
Time: ${new Date().toLocaleTimeString()}
Direct chat: https://wa.me/${clientPhone}`;

        await conn.sendMessage(ownerJid, { text: alertMsg });
        continue;
      }

      // Button 2: Services & Portfolio Menu
      if (
        lowerText === 'btn_services_menu' ||
        lowerText === 'btn_services_catalog' ||
        lowerText.includes('services & portfolio') ||
        lowerText === 'services' ||
        lowerText === 'portfolio' ||
        lowerText === 'catalog' ||
        lowerText === 'menu'
      ) {
        const servicesMenu = await createServicesMenu(conn);
        await sendInteractiveCard(conn, m.chat, servicesMenu, m);
        continue;
      }

      // 3. FIRST-TIME CONTACT DETECTION (Send Welcome Image Card with 2 Buttons)
      const isFirst = crm.isFirstTime(m.sender);
      if (isFirst) {
        // Register client in CRM
        crm.registerContact(m.sender, {
          name: m.pushName,
          pushName: m.pushName,
          initialMessage: userText
        });

        console.log(chalk.bold.green(`✨ [NEW CLIENT] +${senderNumber} (${m.pushName || 'Unknown'}) registered in CRM!`));

        // Anti-ban: Mark read (blue tick) and natural human reading pause before sending welcome card
        if (conn.readMessages && m.key) await conn.readMessages([m.key]).catch(() => {});
        await new Promise(r => setTimeout(r, randomJitter(1400, 2400)));

        // Send Official Welcome Image Card with 2 Buttons (Chat with Zaman & Services Menu)
        const welcomeCard = await createWelcomeCard(conn, m.pushName, m.sender);
        await sendInteractiveCard(conn, m.chat, welcomeCard, m);
        continue;
      }

      // 4. RETURNING CLIENT / ONGOING INQUIRIES (AI Auto-Consultant)
      // Check if Zaman Haider paused AI in this chat
      if (crm.isAiPaused(m.chat)) {
        console.log(chalk.gray(`[AI Paused] Message from +${senderNumber} ignored (Zaman is chatting manually).`));
        continue;
      }

      // Generate context-aware, language-adaptive response (Roman Urdu, English, Urdu)
      const aiResponse = await generateAiReply(m.sender, userText, m.pushName || 'Friend');

      // Anti-ban: Full human interaction simulation (Blue ticks + reading delay + realistic typing indicator)
      await simulateHumanInteraction(conn, m.chat, m.key, aiResponse);

      await conn.sendMessage(m.chat, { text: aiResponse }, { quoted: m });
    }
  });
}

startAgent().catch(err => {
  console.error('[FATAL STARTUP ERROR]', err);
});
