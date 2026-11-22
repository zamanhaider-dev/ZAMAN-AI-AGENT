/* ⚡ ZAMAN AI ASSISTANT — REMINDERS, TASKS, NOTES & SCHEDULED OUTBOUND DISPATCHER ⚡ */

import fs from 'fs';
import path from 'path';

const REMINDERS_FILE = path.resolve('./database/reminders.json');
const TASKS_FILE = path.resolve('./database/tasks.json');
const NOTES_FILE = path.resolve('./database/notes.json');
const SCHEDULED_MSGS_FILE = path.resolve('./database/scheduled_messages.json');

function initStorage() {
  const dir = path.resolve('./database');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(REMINDERS_FILE)) fs.writeFileSync(REMINDERS_FILE, JSON.stringify([], null, 2), 'utf8');
  if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2), 'utf8');
  if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2), 'utf8');
  if (!fs.existsSync(SCHEDULED_MSGS_FILE)) fs.writeFileSync(SCHEDULED_MSGS_FILE, JSON.stringify([], null, 2), 'utf8');
}

initStorage();

function loadJSON(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return defaultVal;
  }
}

function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error saving ${filePath}:`, e.message);
  }
}

// 1. Natural Language & Time Parsing
export function parseReminderTime(rawInput) {
  const text = (rawInput || '').trim();
  const now = new Date();

  // Pattern A: "in X minutes" / "X minute baad" / "X min baad"
  const minMatch = text.match(/(?:in\s+)?(\d+)\s*(?:minutes?|mins?|minute|min)\s*(?:baad|after)?/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    const targetDate = new Date(now.getTime() + mins * 60 * 1000);
    return {
      dueTime: targetDate.getTime(),
      humanTime: targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      matchedPart: minMatch[0]
    };
  }

  // Pattern B: "in X hours" / "X ghante baad" / "X hr baad"
  const hrMatch = text.match(/(?:in\s+)?(\d+)\s*(?:hours?|hrs?|ghanta|ghante)\s*(?:baad|after)?/i);
  if (hrMatch) {
    const hrs = parseInt(hrMatch[1], 10);
    const targetDate = new Date(now.getTime() + hrs * 60 * 60 * 1000);
    return {
      dueTime: targetDate.getTime(),
      humanTime: targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      matchedPart: hrMatch[0]
    };
  }

  // Pattern C: "at HH:MM" or "HH:MM" (e.g. 10:30, 22:00)
  const timeMatch = text.match(/(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3]?.toLowerCase();

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    const targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);

    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    return {
      dueTime: targetDate.getTime(),
      humanTime: targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      matchedPart: timeMatch[0]
    };
  }

  // Pattern D: "at X pm" / "at X am" or "X baje" / "X bjy" / "X bajay"
  const bajeMatch = text.match(/(?:at\s+)?(\d{1,2})\s*(?:baje|bjy|bajay|am|pm)/i);
  if (bajeMatch) {
    let hours = parseInt(bajeMatch[1], 10);
    const isPm = /pm/i.test(bajeMatch[0]) || (!/am/i.test(bajeMatch[0]) && hours <= 6);
    if (isPm && hours < 12) hours += 12;
    if (/am/i.test(bajeMatch[0]) && hours === 12) hours = 0;

    const targetDate = new Date();
    targetDate.setHours(hours, 0, 0, 0);

    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    return {
      dueTime: targetDate.getTime(),
      humanTime: targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      matchedPart: bajeMatch[0]
    };
  }

  return null;
}

// 2. Scheduled Outbound Message Parser (e.g. "tum ali ko 10 bjy msg krna ka payment da")
export function parseScheduledOutboundMessage(rawText, currentChatJid = '') {
  const text = (rawText || '').trim();

  // Safety guard: Never parse bot notifications or templates
  if (
    text.includes('Zaman AI Assistant is ONLINE') ||
    text.includes('Auto-management active') ||
    text.includes('Scheduled Message Set!') ||
    text.includes('Auto-Scheduled Message Delivered') ||
    text.includes('REMINDER ALERT') ||
    text.includes('Reminder Scheduled!')
  ) {
    return null;
  }

  const lower = text.toLowerCase();

  // Must express outbound sending intent (msg bhejna, msg karna, schedule msg, etc.)
  const isOutboundMsg = /(?:msg|message)\s*(?:krna|karna|karo|bhejna|send\s*krna|send\s*karna|send)|(?:schedule\s*(?:msg|message))/i.test(lower);
  if (!isOutboundMsg) return null;

  // Extract time
  const timeParsed = parseReminderTime(text);
  if (!timeParsed) return null;

  let targetRecipient = '';
  let messageContent = '';

  // Pattern 1: In current chat ("isay 10 baje msg karna: ...", "inhe 10 bjy message bhejna ke ...")
  if (/(?:isay|issay|inhe|isko|is\s+ko|him|her|client)\s+/i.test(lower)) {
    targetRecipient = 'CURRENT_CHAT';
    let content = text
      .replace(new RegExp(timeParsed.matchedPart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), ' ')
      .replace(/(?:isay|issay|inhe|isko|is\s+ko|him|her|client)/gi, ' ')
      .replace(/(?:ko|k|ke)?\s*(?:msg|message)\s*(?:krna|karna|karo|bhejna|send\s*krna|send\s*karna|send)/gi, ' ')
      .replace(/(?:^|\s)(?:ka|ke|k|that|saying|:)\s+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    messageContent = content;
  }
  // Pattern 2: Named or numbered contact ("tum ali ko 10 bjy msg krna ka mja payemnt da")
  else {
    const targetMatch = text.match(/(?:tum\s+)?([a-zA-Z0-9_+]+)\s+ko/i) || text.match(/(?:to\s+)([a-zA-Z0-9_+]+)/i);
    if (targetMatch) {
      targetRecipient = targetMatch[1].trim();

      // Clean out recipient and time to get message content
      let content = text
        .replace(new RegExp(timeParsed.matchedPart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), ' ')
        .replace(/(?:schedule\s*msg|schedule\s*message)/gi, ' ')
        .replace(/(?:tum\s+)?(?:[a-zA-Z0-9_+]+)\s+ko/gi, ' ')
        .replace(/(?:to\s+)(?:[a-zA-Z0-9_+]+)/gi, ' ')
        .replace(/(?:msg|message)\s*(?:krna|karna|karo|bhejna|send\s*krna|send\s*karna|send)/gi, ' ')
        .replace(/(?:^|\s)(?:ka|ke|k|that|saying|:)\s+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      messageContent = content;
    }
  }

  if (!targetRecipient || !messageContent) return null;

  return {
    recipientRaw: targetRecipient,
    message: messageContent,
    dueTime: timeParsed.dueTime,
    humanTime: timeParsed.humanTime
  };
}

// 3. Reminders Parser for Personal Reminders
export function parseReminderMessage(rawText) {
  const text = (rawText || '').trim();

  // Safety guard: Never parse bot notifications or templates
  if (
    text.includes('Zaman AI Assistant is ONLINE') ||
    text.includes('Auto-management active') ||
    text.includes('Reminder Scheduled!') ||
    text.includes('REMINDER ALERT') ||
    text.includes('Scheduled Message Set!') ||
    text.includes('Auto-Scheduled Message Delivered') ||
    text.includes('Type *status* or *leads*')
  ) {
    return null;
  }

  const lower = text.toLowerCase();

  // If it's an outbound message directed to someone else ("ali ko msg krna"), do not parse as personal reminder
  if (/(?:ko|to)\s+.*(?:msg|message)\s*(?:krna|bhejna|send)/i.test(lower)) return null;

  const isReminderIntent = /remind|reminder|yaad|yad|yad dlwana|yad karwana|yaad dilana|yad dilana/i.test(lower);
  if (!isReminderIntent) return null;

  const timeParsed = parseReminderTime(text);
  if (!timeParsed) return null;

  let task = text.replace(new RegExp(timeParsed.matchedPart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), ' ');

  task = task
    .replace(/(?:please\s+)?(?:remind me|set reminder|reminder|yaad dilana|yad dlwana|yad karwana|yaad karwana)/gi, ' ')
    .replace(/(?:meri\s+chat\s+ma|meri\s+chat\s+me|mujhe|mja|mjhe|mujy)\s*(?:yad|yaad)?\s*(?:dlwana|karwana|dilana)?\s*(?:ha|hai)?\s*(?:ka|k|ke)?/gi, ' ')
    .replace(/(?:^|\s)(?:at|to|in|pe|par|k|ke|ka|that|about)\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!task) task = 'Reminder';

  return {
    task,
    dueTime: timeParsed.dueTime,
    humanTime: timeParsed.humanTime
  };
}

// 4. Scheduled Outbound Messages Management
export function addScheduledMessage({ recipientJid, recipientName, message, dueTime, humanTime, ownerJid }) {
  const list = loadJSON(SCHEDULED_MSGS_FILE, []);
  const item = {
    id: `sched_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    recipientJid,
    recipientName: recipientName || recipientJid.split('@')[0],
    message,
    dueTime,
    humanTime,
    ownerJid,
    sent: false,
    createdAt: new Date().toISOString()
  };

  list.push(item);
  saveJSON(SCHEDULED_MSGS_FILE, list);
  return item;
}

export function getPendingScheduledMessages() {
  const list = loadJSON(SCHEDULED_MSGS_FILE, []);
  return list.filter(m => !m.sent);
}

export function clearScheduledMessages() {
  saveJSON(SCHEDULED_MSGS_FILE, []);
  return true;
}

// 5. Reminders Management
export function addReminder(targetJid, task, dueTime, humanTime) {
  const list = loadJSON(REMINDERS_FILE, []);
  const item = {
    id: `rem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    targetJid,
    task,
    dueTime,
    humanTime,
    createdAt: new Date().toISOString(),
    fired: false
  };

  list.push(item);
  saveJSON(REMINDERS_FILE, list);
  return item;
}

export function getPendingReminders(targetJid) {
  const list = loadJSON(REMINDERS_FILE, []);
  const cleanTarget = (targetJid || '').split('@')[0].replace(/\D/g, '');
  return list.filter(r => {
    const itemTarget = (r.targetJid || '').split('@')[0].replace(/\D/g, '');
    return (!cleanTarget || itemTarget === cleanTarget) && !r.fired;
  });
}

export function clearReminders(targetJid) {
  const list = loadJSON(REMINDERS_FILE, []);
  const cleanTarget = (targetJid || '').split('@')[0].replace(/\D/g, '');
  const remaining = list.filter(r => {
    const itemTarget = (r.targetJid || '').split('@')[0].replace(/\D/g, '');
    return cleanTarget && itemTarget !== cleanTarget;
  });
  saveJSON(REMINDERS_FILE, remaining);
  return true;
}

// 6. Tasks Management
export function addTask(text) {
  const list = loadJSON(TASKS_FILE, []);
  const item = {
    id: list.length + 1,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    done: false
  };
  list.push(item);
  saveJSON(TASKS_FILE, list);
  return item;
}

export function getTasks() {
  return loadJSON(TASKS_FILE, []);
}

export function doneTask(index) {
  const list = loadJSON(TASKS_FILE, []);
  if (index < 1 || index > list.length) return null;
  list[index - 1].done = true;
  saveJSON(TASKS_FILE, list);
  return list[index - 1];
}

export function deleteTask(index) {
  const list = loadJSON(TASKS_FILE, []);
  if (index < 1 || index > list.length) return null;
  const removed = list.splice(index - 1, 1)[0];
  list.forEach((t, i) => { t.id = i + 1; });
  saveJSON(TASKS_FILE, list);
  return removed;
}

export function clearTasks() {
  saveJSON(TASKS_FILE, []);
  return true;
}

// 7. Notes Management
export function addNote(text) {
  const list = loadJSON(NOTES_FILE, []);
  const item = {
    id: list.length + 1,
    text: text.trim(),
    createdAt: new Date().toISOString()
  };
  list.push(item);
  saveJSON(NOTES_FILE, list);
  return item;
}

export function getNotes() {
  return loadJSON(NOTES_FILE, []);
}

export function deleteNote(index) {
  const list = loadJSON(NOTES_FILE, []);
  if (index < 1 || index > list.length) return null;
  const removed = list.splice(index - 1, 1)[0];
  list.forEach((n, i) => { n.id = i + 1; });
  saveJSON(NOTES_FILE, list);
  return removed;
}

export function clearNotes() {
  saveJSON(NOTES_FILE, []);
  return true;
}

// 8. Active Scheduler Loop (checks due reminders & scheduled messages every 15 seconds)
let schedulerInterval = null;

export function initScheduler(conn) {
  if (schedulerInterval) clearInterval(schedulerInterval);

  schedulerInterval = setInterval(async () => {
    try {
      const now = Date.now();

      // Check Personal Reminders
      const remList = loadJSON(REMINDERS_FILE, []);
      let remUpdated = false;

      for (const item of remList) {
        if (!item.fired && item.dueTime <= now) {
          item.fired = true;
          remUpdated = true;

          const alertMsg = `⏰ *REMINDER ALERT!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Task:* ${item.task}
🕒 *Scheduled for:* ${item.humanTime}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

          if (conn && conn.sendMessage && item.targetJid) {
            try {
              await conn.sendMessage(item.targetJid, { text: alertMsg });
            } catch (err) {
              console.error('[SCHEDULER] Failed to deliver reminder:', err.message);
            }
          }
        }
      }

      if (remUpdated) {
        saveJSON(REMINDERS_FILE, remList);
      }

      // Check Outbound Scheduled Messages (e.g. to Ali)
      const schedList = loadJSON(SCHEDULED_MSGS_FILE, []);
      let schedUpdated = false;

      for (const item of schedList) {
        if (!item.sent && item.dueTime <= now) {
          item.sent = true;
          schedUpdated = true;

          try {
            // 1. Deliver the scheduled message directly to the recipient
            if (conn && conn.sendMessage && item.recipientJid) {
              await conn.sendMessage(item.recipientJid, { text: item.message });
              console.log(`[SCHEDULED-DISPATCH] Successfully sent message to ${item.recipientName} (${item.recipientJid})`);

              // 2. Alert Zaman Haider that the message was sent
              if (item.ownerJid) {
                const notifyMsg = `✅ *Auto-Scheduled Message Delivered!*\n\n👤 *Sent To:* ${item.recipientName} (+${item.recipientJid.split('@')[0]})\n💬 *Message:* "${item.message}"\n🕒 *Delivered at:* ${item.humanTime}`;
                await conn.sendMessage(item.ownerJid, { text: notifyMsg });
              }
            }
          } catch (err) {
            console.error('[SCHEDULED-DISPATCH] Delivery failed:', err.message);
            if (item.ownerJid) {
              await conn.sendMessage(item.ownerJid, {
                text: `❌ *Failed to deliver scheduled message to ${item.recipientName}:* ${err.message}`
              });
            }
          }
        }
      }

      if (schedUpdated) {
        saveJSON(SCHEDULED_MSGS_FILE, schedList);
      }

    } catch (e) {
      console.error('[SCHEDULER-ERROR]', e.message);
    }
  }, 15000);
}

export default {
  parseReminderTime,
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
  clearNotes,
  initScheduler
};
