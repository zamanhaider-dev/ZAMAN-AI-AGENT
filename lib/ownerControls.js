/* ⚡ ZAMAN AI ASSISTANT — PREFIX-LESS MASTER OWNER CONTROLS ⚡ */

import config from '../config.js';
import crm from './leadCrm.js';
import { safeBroadcastDelay } from './antiBan.js';
import {
  parseReminderMessage,
  parseScheduledOutboundMessage,
  addScheduledMessage,
  getPendingScheduledMessages,
  clearScheduledMessages,
  addReminder,
  getPendingReminders,
  clearReminders,
  addTask,
  getTasks,
  doneTask,
  deleteTask,
  clearTasks,
  addNote,
  getNotes,
  deleteNote,
  clearNotes
} from './scheduler.js';

const delay = ms => new Promise(r => setTimeout(r, ms));

export async function handleOwnerCommand(m, conn) {
  // Only execute for Zaman Haider
  const senderNumber = (m.sender || '').split('@')[0].replace(/[^0-9]/g, '');
  const ownerNumber = config.owner.number.replace(/[^0-9]/g, '');
  const isOwner = m.fromMe || senderNumber === ownerNumber;

  if (!isOwner) return false;

  const rawText = (m.text || '').trim();

  // Safety guard: Never process bot's own outbound announcements, reports, or alerts as owner commands
  if (
    rawText.includes('Zaman AI Assistant is ONLINE') ||
    rawText.includes('Auto-management active') ||
    rawText.includes('Reminder Scheduled!') ||
    rawText.includes('REMINDER ALERT') ||
    rawText.includes('Scheduled Message Set!') ||
    rawText.includes('Auto-Scheduled Message Delivered') ||
    rawText.includes('Priority Alert Delivered') ||
    rawText.includes('Direct Chat Request') ||
    rawText.includes('Type *status* or *leads*') ||
    rawText.includes('Welcome to Zaman Haider')
  ) {
    return false;
  }

  const lower = rawText.toLowerCase();
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || '';
  const isMedia = /image|video|audio|document/.test(mime);

  // 1. STATUS & AGENT HEALTH
  if (lower === 'agent status' || lower === 'status' || lower === 'info') {
    const contacts = crm.getAllContacts();
    const groups = crm.getAllGroups();
    const settings = crm.getSettings();
    const aiConfig = crm.getAiConfig();
    const tasks = getTasks();
    const pendingReminders = getPendingReminders(m.chat);
    const uptimeSec = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);

    const statusMsg = `*Zaman AI Agent Status*
• Master: ${config.owner.name}
• Uptime: ${hours}h ${mins}m
• Tracked Leads: ${contacts.length}
• Tracked Groups: ${groups.length}
• Pending Reminders: ${pendingReminders.length}
• Pending Tasks: ${tasks.filter(t => !t.done).length}
• AI Auto-Reply: ${settings.isGlobalAiEnabled ? 'Enabled' : 'Paused'}
• Active Provider: *${aiConfig.activeProvider.toUpperCase()}*

*Commands Overview:*
• Voice Commands — Send any audio note in Roman Urdu / English
• leads / crm — View client leads & group summary
• groups — View all active WhatsApp groups
• reminders — View scheduled reminders
• tasks — View to-do list (add task: <msg>)
• notes — View notes (add note: <msg>)
• block / unblock <phone> — Manage blocked contacts
• ai config — Manage Gemini, OpenAI & Groq
• show prompt — View training prompt
• set prompt: <text> — Retrain AI assistant
• pause ai / resume ai — Control AI in this chat
• post status: <text> — Post to WhatsApp Status
• broadcast contacts: <msg> — Message saved contacts
• broadcast groups: <msg> — Message all groups`;

    await conn.sendMessage(m.chat, { text: statusMsg }, { quoted: m });
    return true;
  }

  // 2. AI PAUSE / RESUME TOGGLES
  if (lower === 'pause ai' || lower === 'stop ai' || lower === 'silent') {
    crm.pauseAi(m.chat);
    await conn.sendMessage(m.chat, { text: `AI paused for this chat. You can reply manually. Type "resume ai" to hand back to AI.` }, { quoted: m });
    return true;
  }

  if (lower === 'resume ai' || lower === 'start ai' || lower === 'unpause ai') {
    crm.resumeAi(m.chat);
    await conn.sendMessage(m.chat, { text: `AI resumed for this chat.` }, { quoted: m });
    return true;
  }

  if (lower === 'ai off') {
    crm.setGlobalAi(false);
    await conn.sendMessage(m.chat, { text: `Global AI auto-reply turned OFF.` }, { quoted: m });
    return true;
  }

  if (lower === 'ai on') {
    crm.setGlobalAi(true);
    await conn.sendMessage(m.chat, { text: `Global AI auto-reply turned ON.` }, { quoted: m });
    return true;
  }

  // 3. BLOCK & UNBLOCK CONTACTS (Direct by typing in chat or providing phone number)
  if (lower === 'unblock' || lower === 'unblock user' || lower === 'unblock this' || lower.startsWith('unblock ')) {
    let targetJid = '';

    // A: Quoted message
    if (m.quoted && m.quoted.sender) {
      targetJid = m.quoted.sender;
    }
    // B: Explicit number argument
    else if (lower.startsWith('unblock ') && rawText.replace(/^unblock\s+/i, '').replace(/\D/g, '')) {
      const num = rawText.replace(/^unblock\s+/i, '').replace(/\D/g, '');
      targetJid = `${num}@s.whatsapp.net`;
    }
    // C: Currently chatting in a 1-on-1 private chat
    else if (!m.isGroup && m.chat && m.chat.endsWith('@s.whatsapp.net')) {
      targetJid = m.chat;
    }

    if (!targetJid) {
      await conn.sendMessage(m.chat, { text: `Please provide a number: "unblock 923001234567" or type in private chat.` }, { quoted: m });
      return true;
    }

    const cleanNum = targetJid.split('@')[0].replace(/\D/g, '');
    try {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      await conn.updateBlockStatus(targetJid, 'unblock');
      await conn.sendMessage(m.chat, { text: `✅ *Contact +${cleanNum} has been unblocked.*` }, { quoted: m });
    } catch (e) {
      await conn.sendMessage(m.chat, { text: `❌ Failed to unblock: ${e.message}` }, { quoted: m });
    }
    return true;
  }

  if (lower === 'block' || lower === 'block user' || lower === 'block this' || lower.startsWith('block ')) {
    let targetJid = '';

    // A: Quoted message
    if (m.quoted && m.quoted.sender) {
      targetJid = m.quoted.sender;
    }
    // B: Explicit number argument
    else if (lower.startsWith('block ') && rawText.replace(/^block\s+/i, '').replace(/\D/g, '')) {
      const num = rawText.replace(/^block\s+/i, '').replace(/\D/g, '');
      targetJid = `${num}@s.whatsapp.net`;
    }
    // C: Currently chatting in a 1-on-1 private chat
    else if (!m.isGroup && m.chat && m.chat.endsWith('@s.whatsapp.net')) {
      targetJid = m.chat;
    }

    if (!targetJid) {
      await conn.sendMessage(m.chat, { text: `Please provide a number: "block 923001234567" or type in private chat.` }, { quoted: m });
      return true;
    }

    const cleanNum = targetJid.split('@')[0].replace(/\D/g, '');
    try {
      await conn.sendMessage(m.chat, { react: { text: '🚫', key: m.key } });
      await conn.sendMessage(m.chat, { text: `🚫 *Contact +${cleanNum} has been blocked.*` }, { quoted: m });
      await conn.updateBlockStatus(targetJid, 'block');
    } catch (e) {
      await conn.sendMessage(m.chat, { text: `❌ Failed to block: ${e.message}` }, { quoted: m });
    }
    return true;
  }

  if (lower === 'blocklist' || lower === 'blocked' || lower === 'blocked list') {
    try {
      const list = await conn.fetchBlocklist();
      if (!list || list.length === 0) {
        await conn.sendMessage(m.chat, { text: `📂 Blocklist is empty.` }, { quoted: m });
      } else {
        let msg = `*Blocked Contacts (${list.length}):*\n\n`;
        list.forEach((j, i) => { msg += `${i + 1}. +${j.split('@')[0]}\n`; });
        await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
      }
    } catch (e) {
      await conn.sendMessage(m.chat, { text: `❌ Could not fetch blocklist: ${e.message}` }, { quoted: m });
    }
    return true;
  }

  // 4. OUTBOUND SCHEDULED MESSAGES (e.g. "tum ali ko 10 bjy msg krna ka mja payemnt da")
  const parsedOut = parseScheduledOutboundMessage(rawText, m.chat);
  if (parsedOut) {
    let targetJid = '';
    let recipientName = '';

    if (parsedOut.recipientRaw === 'CURRENT_CHAT') {
      targetJid = m.chat;
      recipientName = 'This Chat';
    } else {
      const rawTarget = parsedOut.recipientRaw;
      const digits = rawTarget.replace(/\D/g, '');

      // Check if phone number
      if (digits.length >= 7 && digits.length <= 15) {
        let phone = digits;
        if (phone.startsWith('03')) phone = '92' + phone.slice(1);
        targetJid = `${phone}@s.whatsapp.net`;
        recipientName = `+${phone}`;
      } else {
        // Search CRM contacts by name (e.g. Ali)
        const allContacts = crm.getAllContacts();
        const matched = allContacts.find(c =>
          (c.name || '').toLowerCase().includes(rawTarget.toLowerCase()) ||
          (c.pushName || '').toLowerCase().includes(rawTarget.toLowerCase())
        );

        if (matched) {
          targetJid = matched.jid;
          recipientName = matched.name || matched.pushName;
        } else {
          await conn.sendMessage(m.chat, {
            text: `⚠️ *Contact "${rawTarget}" CRM me nahi mila.*\nAap direct number de kar schedule karein, jaise:\n"92300xxxxxxx ko 10 bjy msg krna: ${parsedOut.message}"`
          }, { quoted: m });
          return true;
        }
      }
    }

    const item = addScheduledMessage({
      recipientJid: targetJid,
      recipientName,
      message: parsedOut.message,
      dueTime: parsedOut.dueTime,
      humanTime: parsedOut.humanTime,
      ownerJid: `${ownerNumber}@s.whatsapp.net`
    });

    await conn.sendMessage(m.chat, {
      text: `📅 *Automated Message Scheduled!*\n\n👤 *Sent To:* ${recipientName} (+${targetJid.split('@')[0]})\n💬 *Message:* "${item.message}"\n🕒 *Scheduled Time:* ${item.humanTime}\n\n_Bot automatically Ali ko 10 baje yeh message bhej dega aur aapko confirmation alert dega!_`
    }, { quoted: m });
    return true;
  }

  if (lower === 'scheduled' || lower === 'scheduled msgs' || lower === 'scheduled messages') {
    const list = getPendingScheduledMessages();
    if (list.length === 0) {
      await conn.sendMessage(m.chat, { text: `No outbound messages scheduled.` }, { quoted: m });
    } else {
      let msg = `*Scheduled Messages (${list.length}):*\n\n`;
      list.forEach((s, idx) => {
        msg += `${idx + 1}. *To:* ${s.recipientName} (+${s.recipientJid.split('@')[0]})\n   🕒 ${s.humanTime}\n   💬 "${s.message}"\n\n`;
      });
      msg += `_Type "clear scheduled" to cancel all._`;
      await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
    }
    return true;
  }

  if (lower === 'clear scheduled') {
    clearScheduledMessages();
    await conn.sendMessage(m.chat, { text: `🗑️ All outbound scheduled messages cleared.` }, { quoted: m });
    return true;
  }

  // 5. REMINDERS (Natural Language in Roman Urdu or English)
  const parsedRem = parseReminderMessage(rawText);
  if (parsedRem) {
    const targetChat = m.chat;
    const item = addReminder(targetChat, parsedRem.task, parsedRem.dueTime, parsedRem.humanTime);
    await conn.sendMessage(m.chat, {
      text: `⏰ *Reminder Scheduled!*\n\n📌 *Task:* ${item.task}\n🕒 *Time:* ${item.humanTime}\n\n_I will remind you right here in this chat!_`
    }, { quoted: m });
    return true;
  }

  if (lower === 'reminders' || lower === 'reminder list' || lower === 'show reminders') {
    const list = getPendingReminders(m.chat);
    if (list.length === 0) {
      await conn.sendMessage(m.chat, { text: `No active reminders pending. Set one with:\n"remind me at 10 pm to call client" or "10 baje yaad dilwana: ..."` }, { quoted: m });
    } else {
      let msg = `*Pending Reminders (${list.length}):*\n\n`;
      list.forEach((r, idx) => {
        msg += `${idx + 1}. *${r.task}*\n   🕒 ${r.humanTime}\n\n`;
      });
      msg += `_Type "clear reminders" to remove all._`;
      await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
    }
    return true;
  }

  if (lower === 'clear reminders' || lower === 'delete reminders') {
    clearReminders(m.chat);
    await conn.sendMessage(m.chat, { text: `🗑️ All pending reminders cleared.` }, { quoted: m });
    return true;
  }

  // 5. TASKS / TO-DO LIST
  if (lower.startsWith('add task:') || lower.startsWith('task:')) {
    const taskContent = rawText.replace(/^(add\s+task|task):\s*/i, '').trim();
    if (!taskContent) {
      await conn.sendMessage(m.chat, { text: `Please provide a task: "add task: Deploy AI agent"` }, { quoted: m });
      return true;
    }
    const t = addTask(taskContent);
    await conn.sendMessage(m.chat, { text: `✅ *Task #${t.id} Added:* "${t.text}"` }, { quoted: m });
    return true;
  }

  if (lower === 'tasks' || lower === 'task list' || lower === 'todo') {
    const tasks = getTasks();
    if (tasks.length === 0) {
      await conn.sendMessage(m.chat, { text: `No tasks found. Add a task with:\n"add task: Submit project proposal"` }, { quoted: m });
    } else {
      let msg = `*Task List (${tasks.length}):*\n\n`;
      tasks.forEach((t) => {
        msg += `${t.id}. ${t.done ? '☑️ ~' + t.text + '~' : '⬜ ' + t.text}\n`;
      });
      msg += `\n_Commands:_ "done task <id>", "delete task <id>", "clear tasks"`;
      await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
    }
    return true;
  }

  if (lower.startsWith('done task ') || lower.startsWith('complete task ')) {
    const id = parseInt(rawText.replace(/^(done\s+task|complete\s+task)\s*/i, '').trim(), 10);
    const res = doneTask(id);
    if (res) {
      await conn.sendMessage(m.chat, { text: `☑️ *Task #${id} marked as done:* "${res.text}"` }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: `❌ Task #${id} not found.` }, { quoted: m });
    }
    return true;
  }

  if (lower.startsWith('delete task ') || lower.startsWith('remove task ')) {
    const id = parseInt(rawText.replace(/^(delete\s+task|remove\s+task)\s*/i, '').trim(), 10);
    const res = deleteTask(id);
    if (res) {
      await conn.sendMessage(m.chat, { text: `🗑️ *Task #${id} deleted:* "${res.text}"` }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: `❌ Task #${id} not found.` }, { quoted: m });
    }
    return true;
  }

  if (lower === 'clear tasks') {
    clearTasks();
    await conn.sendMessage(m.chat, { text: `🗑️ All tasks cleared.` }, { quoted: m });
    return true;
  }

  // 6. NOTES
  if (lower.startsWith('add note:') || lower.startsWith('note:')) {
    const noteContent = rawText.replace(/^(add\s+note|note):\s*/i, '').trim();
    if (!noteContent) {
      await conn.sendMessage(m.chat, { text: `Please provide note content: "add note: Meeting points with client"` }, { quoted: m });
      return true;
    }
    const n = addNote(noteContent);
    await conn.sendMessage(m.chat, { text: `📝 *Note #${n.id} Saved:* "${n.text}"` }, { quoted: m });
    return true;
  }

  if (lower === 'notes' || lower === 'note list' || lower === 'show notes') {
    const notes = getNotes();
    if (notes.length === 0) {
      await conn.sendMessage(m.chat, { text: `No notes found. Add a note with:\n"add note: Important ideas"` }, { quoted: m });
    } else {
      let msg = `*Saved Notes (${notes.length}):*\n\n`;
      notes.forEach((n) => {
        msg += `${n.id}. ${n.text}\n   📅 ${new Date(n.createdAt).toLocaleDateString()}\n\n`;
      });
      msg += `_Commands:_ "delete note <id>", "clear notes"`;
      await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
    }
    return true;
  }

  if (lower.startsWith('delete note ') || lower.startsWith('remove note ')) {
    const id = parseInt(rawText.replace(/^(delete\s+note|remove\s+note)\s*/i, '').trim(), 10);
    const res = deleteNote(id);
    if (res) {
      await conn.sendMessage(m.chat, { text: `🗑️ *Note #${id} deleted.*` }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: `❌ Note #${id} not found.` }, { quoted: m });
    }
    return true;
  }

  if (lower === 'clear notes') {
    clearNotes();
    await conn.sendMessage(m.chat, { text: `🗑️ All notes cleared.` }, { quoted: m });
    return true;
  }

  // 7. LEADS & CRM OVERVIEW (Contacts + Groups)
  if (lower === 'leads' || lower === 'show leads' || lower === 'clients' || lower === 'crm') {
    const list = crm.getAllContacts();
    const groups = crm.getAllGroups();

    let report = `*Zaman Haider — CRM & Leads*\n\n`;

    report += `👥 *Client Leads (${list.length}):*\n`;
    if (list.length === 0) {
      report += `_No private clients registered yet._\n\n`;
    } else {
      list.slice(-15).reverse().forEach((c, idx) => {
        report += `${idx + 1}. *${c.name}* (+${c.phone})\n`;
        report += `   Date: ${new Date(c.firstSeen).toLocaleDateString()}\n`;
        if (c.initialInquiry) report += `   Msg: "${c.initialInquiry.slice(0, 50)}"\n`;
        report += `   wa.me/${c.phone}\n\n`;
      });
    }

    report += `🏢 *Groups Summary (${groups.length}):*\n`;
    if (groups.length === 0) {
      report += `_No groups recorded yet. Type "groups" to sync._\n`;
    } else {
      groups.slice(-5).forEach((g, idx) => {
        report += `${idx + 1}. *${g.subject}* (${g.size} members) | Admin: ${g.isBotAdmin ? 'Yes' : 'No'}\n`;
      });
      report += `\n_Type "groups" to see full list._\n`;
    }

    await conn.sendMessage(m.chat, { text: report }, { quoted: m });
    return true;
  }

  // 8. GROUPS COMMAND & LIVE SYNC
  if (lower === 'groups' || lower === 'group list' || lower === 'sync groups') {
    try {
      const parts = await conn.groupFetchAllParticipating().catch(() => ({}));
      const myId = (conn.user?.id || '').split(':')[0].replace(/\D/g, '');

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

    const groups = crm.getAllGroups();
    if (groups.length === 0) {
      await conn.sendMessage(m.chat, { text: `No active groups found or bot is not in any group.` }, { quoted: m });
      return true;
    }

    let report = `*Active WhatsApp Groups (${groups.length}):*\n\n`;
    groups.forEach((g, idx) => {
      report += `${idx + 1}. *${g.subject}*\n`;
      report += `   Members: ${g.size} | Bot Admin: ${g.isBotAdmin ? '✅ Yes' : '❌ No'}\n`;
      report += `   ID: ${g.jid.split('@')[0]}\n\n`;
    });

    await conn.sendMessage(m.chat, { text: report }, { quoted: m });
    return true;
  }

  // 9. AI ENGINE CONFIGURATION (GEMINI, OPENAI, GROQ)
  if (lower === 'ai config' || lower === 'ai info' || lower === 'ai status') {
    const ai = crm.getAiConfig();
    const configMsg = `*AI Engine Configuration:*
• Active Provider: *${ai.activeProvider.toUpperCase()}*

1. *Google Gemini:*
   - Model: ${ai.gemini.model}
   - Key: ${ai.gemini.apiKey ? '✅ Configured (' + ai.gemini.apiKey.slice(0, 6) + '...)' : '❌ Not set'}

2. *OpenAI:*
   - Model: ${ai.openai.model}
   - Key: ${ai.openai.apiKey ? '✅ Configured (' + ai.openai.apiKey.slice(0, 6) + '...)' : '❌ Not set'}

3. *Groq (Fast LLaMA 3.3):*
   - Model: ${ai.groq.model}
   - Key: ${ai.groq.apiKey ? '✅ Configured (' + ai.groq.apiKey.slice(0, 6) + '...)' : '❌ Not set'}

*Commands to Update:*
• set ai provider: <gemini | openai | groq>
• set gemini key: <your_key>
• set openai key: <your_key>
• set groq key: <your_key>`;

    await conn.sendMessage(m.chat, { text: configMsg }, { quoted: m });
    return true;
  }

  if (lower.startsWith('set ai provider:')) {
    const provider = rawText.split(':').slice(1).join(':').trim().toLowerCase();
    const ok = crm.setAiProvider(provider);
    if (ok) {
      await conn.sendMessage(m.chat, { text: `✅ Active AI provider switched to: *${provider.toUpperCase()}*` }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: `❌ Invalid provider. Choose: gemini, openai, or groq` }, { quoted: m });
    }
    return true;
  }

  if (lower.startsWith('set gemini key:')) {
    const key = rawText.split(':').slice(1).join(':').trim();
    crm.setAiKey('gemini', key);
    await conn.sendMessage(m.chat, { text: `✅ Google Gemini API key updated!` }, { quoted: m });
    return true;
  }

  if (lower.startsWith('set openai key:')) {
    const key = rawText.split(':').slice(1).join(':').trim();
    crm.setAiKey('openai', key);
    await conn.sendMessage(m.chat, { text: `✅ OpenAI API key updated!` }, { quoted: m });
    return true;
  }

  if (lower.startsWith('set groq key:')) {
    const key = rawText.split(':').slice(1).join(':').trim();
    crm.setAiKey('groq', key);
    await conn.sendMessage(m.chat, { text: `✅ Groq API key updated!` }, { quoted: m });
    return true;
  }

  // 10. MASTER TRAINING PROMPT MANAGEMENT
  if (lower === 'show prompt' || lower === 'view prompt' || lower === 'get prompt') {
    const prompt = crm.getMasterPrompt();
    await conn.sendMessage(m.chat, { text: `*Master AI Training Prompt:*\n\n${prompt}` }, { quoted: m });
    return true;
  }

  if (lower.startsWith('set prompt:')) {
    const newPrompt = rawText.split(':').slice(1).join(':').trim();
    if (!newPrompt) {
      await conn.sendMessage(m.chat, { text: `Please provide instructions, e.g.: set prompt: You are Zaman's AI Assistant...` }, { quoted: m });
      return true;
    }
    crm.setMasterPrompt(newPrompt);
    await conn.sendMessage(m.chat, { text: `✅ *Master Training Prompt updated!* The AI will now consult using your new instructions.` }, { quoted: m });
    return true;
  }

  if (lower === 'reset prompt') {
    crm.resetMasterPrompt();
    await conn.sendMessage(m.chat, { text: `✅ *Master Training Prompt reset to default template.*` }, { quoted: m });
    return true;
  }

  // 11. POST TO WHATSAPP STATUS / STORY (Prefix-less)
  if (lower.startsWith('post status:') || lower.startsWith('set status:') || lower.startsWith('story:') || (isMedia && (lower === 'post status' || lower === 'send to status'))) {
    const statusText = rawText.includes(':') ? rawText.split(':').slice(1).join(':').trim() : (q.text || '');
    await conn.sendMessage(m.chat, { text: `⏳ *Posting to WhatsApp Status...*` }, { quoted: m });

    try {
      if (isMedia) {
        const buf = await q.download();
        if (/image/.test(mime)) {
          await conn.sendMessage('status@broadcast', { image: buf, caption: statusText });
        } else if (/video/.test(mime)) {
          await conn.sendMessage('status@broadcast', { video: buf, caption: statusText });
        } else if (/audio/.test(mime)) {
          await conn.sendMessage('status@broadcast', { audio: buf, mimetype: mime, ptt: true });
        }
      } else {
        await conn.sendMessage('status@broadcast', { text: statusText });
      }
      await conn.sendMessage(m.chat, { text: `✅ *Successfully posted to WhatsApp Status!*` }, { quoted: m });
    } catch (err) {
      await conn.sendMessage(m.chat, { text: `❌ *Failed to post status:* ${err.message}` }, { quoted: m });
    }
    return true;
  }

  // 12. BROADCAST TO CONTACTS / LEADS (Prefix-less)
  if (lower.startsWith('broadcast contacts:') || lower.startsWith('bc contacts:') || (isMedia && lower === 'broadcast contacts')) {
    const broadcastMsg = rawText.includes(':') ? rawText.split(':').slice(1).join(':').trim() : (q.text || '');
    const contacts = crm.getAllContacts();

    if (contacts.length === 0) {
      await conn.sendMessage(m.chat, { text: `⚠️ No saved contacts in database to broadcast to.` }, { quoted: m });
      return true;
    }

    await conn.sendMessage(m.chat, { text: `🚀 *Broadcasting to ${contacts.length} saved contacts...*` }, { quoted: m });

    let mediaBuf = null;
    if (isMedia) mediaBuf = await q.download().catch(() => null);

    let sent = 0;
    for (const c of contacts) {
      try {
        const targetJid = `${c.phone}@s.whatsapp.net`;
        if (mediaBuf) {
          if (/image/.test(mime)) await conn.sendMessage(targetJid, { image: mediaBuf, caption: broadcastMsg });
          else if (/video/.test(mime)) await conn.sendMessage(targetJid, { video: mediaBuf, caption: broadcastMsg });
          else await conn.sendMessage(targetJid, { text: broadcastMsg });
        } else {
          await conn.sendMessage(targetJid, { text: broadcastMsg });
        }
        sent++;
      } catch (e) {}
      await safeBroadcastDelay(); // Natural human randomized jitter (3.2s - 5.8s) prevents WhatsApp automated spam bans
    }

    await conn.sendMessage(m.chat, { text: `✅ *Contact broadcast complete:* Sent to ${sent}/${contacts.length} contacts.` }, { quoted: m });
    return true;
  }

  // 13. BROADCAST TO ALL GROUPS (Prefix-less)
  if (lower.startsWith('broadcast groups:') || lower.startsWith('bc groups:') || (isMedia && lower === 'broadcast groups')) {
    const broadcastMsg = rawText.includes(':') ? rawText.split(':').slice(1).join(':').trim() : (q.text || '');
    
    let groupIds = [];
    try {
      const parts = await conn.groupFetchAllParticipating().catch(() => null);
      if (parts) groupIds = Object.keys(parts);
      else groupIds = crm.getAllGroups().map(g => g.jid);
    } catch (e) {
      groupIds = crm.getAllGroups().map(g => g.jid);
    }

    await conn.sendMessage(m.chat, { text: `🚀 *Broadcasting to ${groupIds.length} groups...*` }, { quoted: m });

    let mediaBuf = null;
    if (isMedia) mediaBuf = await q.download().catch(() => null);

    let sent = 0;
    for (const gJid of groupIds) {
      try {
        if (mediaBuf) {
          if (/image/.test(mime)) await conn.sendMessage(gJid, { image: mediaBuf, caption: broadcastMsg });
          else if (/video/.test(mime)) await conn.sendMessage(gJid, { video: mediaBuf, caption: broadcastMsg });
          else await conn.sendMessage(gJid, { text: broadcastMsg });
        } else {
          await conn.sendMessage(gJid, { text: broadcastMsg });
        }
        sent++;
      } catch (e) {}
      await safeBroadcastDelay(); // Natural human randomized jitter
    }

    await conn.sendMessage(m.chat, { text: `✅ *Group broadcast complete:* Delivered to ${sent}/${groupIds.length} groups.` }, { quoted: m });
    return true;
  }

  // 14. SILENT GROUP COMMANDS (Executed with reaction emoji — Zero chat spam!)
  if (m.isGroup) {
    // Mute Group (Close group for members)
    if (lower === 'mute group' || lower === 'close group' || lower === 'mute' || lower === 'close') {
      try {
        await conn.groupSettingUpdate(m.chat, 'announcement');
        await conn.sendMessage(m.chat, { react: { text: '🔒', key: m.key } });
      } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      }
      return true;
    }

    // Unmute Group (Open group for members)
    if (lower === 'unmute group' || lower === 'open group' || lower === 'unmute' || lower === 'open') {
      try {
        await conn.groupSettingUpdate(m.chat, 'not_announcement');
        await conn.sendMessage(m.chat, { react: { text: '🔓', key: m.key } });
      } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      }
      return true;
    }

    // Lock Settings (Only admins can edit info)
    if (lower === 'lock settings' || lower === 'lock group') {
      try {
        await conn.groupSettingUpdate(m.chat, 'locked');
        await conn.sendMessage(m.chat, { react: { text: '🛡️', key: m.key } });
      } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      }
      return true;
    }

    // Unlock Settings (All members can edit info)
    if (lower === 'unlock settings' || lower === 'unlock group') {
      try {
        await conn.groupSettingUpdate(m.chat, 'unlocked');
        await conn.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } });
      } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      }
      return true;
    }

    // Silent Kick / Remove User
    if (lower.startsWith('kick') || lower.startsWith('remove')) {
      const targetUser = m.quoted?.sender || (m.mentionedJid && m.mentionedJid[0]);
      if (targetUser) {
        try {
          await conn.groupParticipantsUpdate(m.chat, [targetUser], 'remove');
          await conn.sendMessage(m.chat, { react: { text: '👋', key: m.key } });
        } catch (e) {
          await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        }
        return true;
      }
    }

    // Silent Promote User
    if (lower.startsWith('promote')) {
      const targetUser = m.quoted?.sender || (m.mentionedJid && m.mentionedJid[0]);
      if (targetUser) {
        try {
          await conn.groupParticipantsUpdate(m.chat, [targetUser], 'promote');
          await conn.sendMessage(m.chat, { react: { text: '⭐', key: m.key } });
        } catch (e) {
          await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        }
        return true;
      }
    }

    // Silent Demote User
    if (lower.startsWith('demote')) {
      const targetUser = m.quoted?.sender || (m.mentionedJid && m.mentionedJid[0]);
      if (targetUser) {
        try {
          await conn.groupParticipantsUpdate(m.chat, [targetUser], 'demote');
          await conn.sendMessage(m.chat, { react: { text: '🔻', key: m.key } });
        } catch (e) {
          await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        }
        return true;
      }
    }

    // Group Link (Still sends link because user specifically requested it)
    if (lower === 'group link' || lower === 'link group') {
      try {
        const code = await conn.groupInviteCode(m.chat);
        await conn.sendMessage(m.chat, { text: `🔗 *Group Invite Link:*\nhttps://chat.whatsapp.com/${code}` }, { quoted: m });
      } catch (e) {
        await conn.sendMessage(m.chat, { text: `❌ Bot must be group admin to generate link.` }, { quoted: m });
      }
      return true;
    }

    // Tag All / Mention Everyone
    if (lower.startsWith('tag all') || lower.startsWith('everyone')) {
      try {
        const meta = await conn.groupMetadata(m.chat);
        const members = meta.participants.map(p => p.id);
        const msgText = rawText.replace(/^(tag all|everyone)/i, '').trim() || 'Attention everyone!';
        await conn.sendMessage(m.chat, {
          text: `📢 *Announcement:*\n${msgText}`,
          mentions: members
        }, { quoted: m });
      } catch (e) {}
      return true;
    }
  }

  return false;
}

export default {
  handleOwnerCommand
};
