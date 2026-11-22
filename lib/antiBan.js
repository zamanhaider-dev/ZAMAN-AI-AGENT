/* ⚡ ZAMAN AI ASSISTANT — ANTI-BAN & HUMAN TELEMETRY EMULATOR ⚡ */

const delay = ms => new Promise(r => setTimeout(r, ms));

// Random jitter generator within range [min, max]
export function randomJitter(minMs = 1200, maxMs = 2800) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Calculate realistic human typing duration based on message length (simulates ~40 WPM)
export function calculateTypingTime(messageText = '') {
  const charCount = (messageText || '').length;
  // ~35ms per character with random variance, clamped between 1.8s and 5.5s
  const baseTime = charCount * 32 + randomJitter(400, 1000);
  return Math.min(Math.max(baseTime, 1800), 5500);
}

/**
 * Simulates complete realistic human behavior before sending an automated reply:
 * 1. Mark incoming message as Read (sends blue ticks)
 * 2. Natural "Reading & Thinking" pause (1.2s - 2.5s)
 * 3. Shows "composing..." (typing indicator) for realistic typing duration
 * 4. Pauses typing right before sending
 */
export async function simulateHumanInteraction(conn, chatJid, incomingKey, replyText = '') {
  if (!conn || !chatJid) return;

  try {
    // 1. Mark message as Read (Real humans read before replying)
    if (incomingKey && conn.readMessages) {
      await conn.readMessages([incomingKey]).catch(() => {});
    }

    // 2. Human Reading / Thinking Delay
    const readingPause = randomJitter(1100, 2200);
    await delay(readingPause);

    // 3. Start "typing..." presence
    if (conn.sendPresenceUpdate) {
      await conn.sendPresenceUpdate('composing', chatJid).catch(() => {});
    }

    // 4. Realistic typing duration proportional to response length
    const typingDuration = calculateTypingTime(replyText);
    await delay(typingDuration);

    // 5. Briefly pause typing before final send
    if (conn.sendPresenceUpdate) {
      await conn.sendPresenceUpdate('paused', chatJid).catch(() => {});
    }
  } catch (err) {
    // Fail-safe: Never block message dispatch if presence update encounters an issue
    console.warn('[ANTI-BAN] Human simulation warning:', err.message);
  }
}

/**
 * Message Burst Debouncer:
 * If a human client sends 2-3 quick messages in a row ("Hello", "Are you there?", "I want a bot"),
 * this debouncer gathers them into a single coherent prompt instead of firing 3 simultaneous AI replies.
 */
const chatQueues = new Map(); // chatJid -> { timeout, messages, pushName }

export function debounceIncomingMessage(chatJid, text, pushName, onDebounceComplete) {
  if (!chatQueues.has(chatJid)) {
    chatQueues.set(chatJid, {
      timeout: null,
      messages: [],
      pushName: pushName || 'Client'
    });
  }

  const queue = chatQueues.get(chatJid);
  queue.messages.push(text);
  if (pushName) queue.pushName = pushName;

  if (queue.timeout) clearTimeout(queue.timeout);

  queue.timeout = setTimeout(() => {
    const combinedText = queue.messages.join(' \n');
    const finalPushName = queue.pushName;
    chatQueues.delete(chatJid);
    onDebounceComplete(combinedText, finalPushName);
  }, 2200); // 2.2 second natural human window
}

/**
 * Throttled Safe Delay for Broadcasts:
 * Prevents rapid-fire bursts that trigger WhatsApp automated spam filters.
 */
export async function safeBroadcastDelay() {
  const safePause = randomJitter(3200, 5800); // 3.2s - 5.8s natural delay between recipients
  await delay(safePause);
}

export default {
  randomJitter,
  calculateTypingTime,
  simulateHumanInteraction,
  debounceIncomingMessage,
  safeBroadcastDelay
};

