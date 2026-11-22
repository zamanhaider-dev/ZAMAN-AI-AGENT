/* ⚡ ZAMAN AI ASSISTANT — LEAD CRM, GROUPS & MEMORY ENGINE ⚡ */

import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { DEFAULT_MASTER_PROMPT } from './masterPrompt.js';

const CONTACTS_FILE = path.resolve(config.database.contactsFile);
const CHATS_FILE = path.resolve(config.database.chatsFile);
const SETTINGS_FILE = path.resolve(config.database.settingsFile);
const GROUPS_FILE = path.resolve(config.database.groupsFile || './database/groups.json');

// Helper to ensure files exist
function initStorage() {
  const dir = path.dirname(CONTACTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, JSON.stringify({}, null, 2), 'utf8');
  if (!fs.existsSync(CHATS_FILE)) fs.writeFileSync(CHATS_FILE, JSON.stringify({}, null, 2), 'utf8');
  if (!fs.existsSync(GROUPS_FILE)) fs.writeFileSync(GROUPS_FILE, JSON.stringify({}, null, 2), 'utf8');
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
      isGlobalAiEnabled: true,
      pausedChats: {}, // jid -> timestamp
      broadcastHistory: [],
      aiConfig: {
        activeProvider: config.ai?.activeProvider || 'gemini',
        gemini: { apiKey: config.ai?.gemini?.apiKey || '', model: config.ai?.gemini?.model || 'gemini-1.5-flash' },
        openai: { apiKey: config.ai?.openai?.apiKey || '', model: config.ai?.openai?.model || 'gpt-4o-mini' },
        groq: { apiKey: config.ai?.groq?.apiKey || '', model: config.ai?.groq?.model || 'llama-3.3-70b-versatile' }
      },
      customMasterPrompt: ''
    }, null, 2), 'utf8');
  }
}

initStorage();

function loadJSON(filePath, defaultVal = {}) {
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

// Check if JID is a valid personal phone number (excludes channels, LIDs, groups, broadcasts)
export function isValidLeadJid(jid = '') {
  if (!jid || typeof jid !== 'string') return false;
  if (jid.endsWith('@newsletter')) return false; // Channel
  if (jid.endsWith('@lid')) return false; // WhatsApp Local ID
  if (jid.endsWith('@g.us')) return false; // Group
  if (jid.includes('broadcast')) return false; // Status / Broadcast

  const digits = jid.split('@')[0].replace(/\D/g, '');
  if (digits.startsWith('120363')) return false; // Internal channel / community prefix
  return digits.length >= 7 && digits.length <= 15;
}

export const crm = {
  isValidLeadJid,

  // Check if contact is brand new (first-time sender)
  isFirstTime(jid) {
    if (!isValidLeadJid(jid)) return false;
    const cleanJid = jid.split('@')[0].replace(/\D/g, '');
    const contacts = loadJSON(CONTACTS_FILE, {});
    return !contacts[cleanJid];
  },

  // Register a new contact (strictly validated)
  registerContact(jid, { name = '', pushName = '', initialMessage = '' } = {}) {
    if (!isValidLeadJid(jid)) return null;
    const cleanJid = jid.split('@')[0].replace(/\D/g, '');
    const contacts = loadJSON(CONTACTS_FILE, {});
    const now = new Date().toISOString();

    contacts[cleanJid] = {
      phone: cleanJid,
      jid: `${cleanJid}@s.whatsapp.net`,
      name: name || pushName || `Lead +${cleanJid}`,
      pushName: pushName || '',
      firstSeen: now,
      lastSeen: now,
      status: 'New Inquiry',
      category: 'General',
      notes: [],
      initialInquiry: (initialMessage || '').slice(0, 300)
    };

    saveJSON(CONTACTS_FILE, contacts);
    return contacts[cleanJid];
  },

  // Update existing contact
  updateContact(jid, updates = {}) {
    if (!isValidLeadJid(jid)) return null;
    const cleanJid = jid.split('@')[0].replace(/\D/g, '');
    const contacts = loadJSON(CONTACTS_FILE, {});
    if (!contacts[cleanJid]) return null;

    contacts[cleanJid] = {
      ...contacts[cleanJid],
      ...updates,
      lastSeen: new Date().toISOString()
    };

    saveJSON(CONTACTS_FILE, contacts);
    return contacts[cleanJid];
  },

  getContact(jid) {
    const cleanJid = jid.split('@')[0].replace(/\D/g, '');
    const contacts = loadJSON(CONTACTS_FILE, {});
    return contacts[cleanJid] || null;
  },

  getAllContacts() {
    const contacts = loadJSON(CONTACTS_FILE, {});
    // Clean out any historical non-phone entries if found
    const valid = {};
    for (const [k, v] of Object.entries(contacts)) {
      if (isValidLeadJid(v.jid || `${k}@s.whatsapp.net`)) {
        valid[k] = v;
      }
    }
    return Object.values(valid);
  },

  // Groups CRM Management
  saveGroup(groupJid, groupData = {}) {
    if (!groupJid || !groupJid.endsWith('@g.us')) return null;
    const groups = loadJSON(GROUPS_FILE, {});
    const now = new Date().toISOString();

    groups[groupJid] = {
      jid: groupJid,
      subject: groupData.subject || groupData.name || groups[groupJid]?.subject || 'Group',
      size: groupData.size || groupData.participants?.length || groups[groupJid]?.size || 0,
      owner: groupData.owner || groups[groupJid]?.owner || '',
      creation: groupData.creation || groups[groupJid]?.creation || null,
      desc: groupData.desc || groups[groupJid]?.desc || '',
      isBotAdmin: groupData.isBotAdmin ?? groups[groupJid]?.isBotAdmin ?? false,
      lastActive: now
    };

    saveJSON(GROUPS_FILE, groups);
    return groups[groupJid];
  },

  getAllGroups() {
    const groups = loadJSON(GROUPS_FILE, {});
    return Object.values(groups);
  },

  getGroup(groupJid) {
    const groups = loadJSON(GROUPS_FILE, {});
    return groups[groupJid] || null;
  },

  // Conversation history for multi-turn AI reasoning
  recordMessage(jid, role, content) {
    const cleanJid = jid.split('@')[0].replace(/\D/g, '');
    if (!cleanJid) return;
    const chats = loadJSON(CHATS_FILE, {});
    if (!chats[cleanJid]) chats[cleanJid] = [];

    chats[cleanJid].push({
      role, // 'user' or 'assistant'
      content,
      timestamp: new Date().toISOString()
    });

    if (chats[cleanJid].length > 20) {
      chats[cleanJid] = chats[cleanJid].slice(-20);
    }

    saveJSON(CHATS_FILE, chats);
  },

  getChatHistory(jid) {
    const cleanJid = jid.split('@')[0].replace(/\D/g, '');
    const chats = loadJSON(CHATS_FILE, {});
    return chats[cleanJid] || [];
  },

  // AI Master Training Prompt
  getMasterPrompt() {
    const settings = loadJSON(SETTINGS_FILE, {});
    return settings.customMasterPrompt?.trim() || DEFAULT_MASTER_PROMPT;
  },

  setMasterPrompt(newPrompt) {
    const settings = loadJSON(SETTINGS_FILE, {});
    settings.customMasterPrompt = newPrompt.trim();
    saveJSON(SETTINGS_FILE, settings);
    return true;
  },

  resetMasterPrompt() {
    const settings = loadJSON(SETTINGS_FILE, {});
    settings.customMasterPrompt = '';
    saveJSON(SETTINGS_FILE, settings);
    return DEFAULT_MASTER_PROMPT;
  },

  // AI Provider & API Key Management
  getAiConfig() {
    const settings = loadJSON(SETTINGS_FILE, {});
    const base = config.ai || {};
    const saved = settings.aiConfig || {};

    return {
      activeProvider: saved.activeProvider || base.activeProvider || 'gemini',
      gemini: {
        apiKey: saved.gemini?.apiKey || base.gemini?.apiKey || process.env.GEMINI_API_KEY || '',
        model: saved.gemini?.model || base.gemini?.model || 'gemini-1.5-flash'
      },
      openai: {
        apiKey: saved.openai?.apiKey || base.openai?.apiKey || process.env.OPENAI_API_KEY || '',
        model: saved.openai?.model || base.openai?.model || 'gpt-4o-mini'
      },
      groq: {
        apiKey: saved.groq?.apiKey || base.groq?.apiKey || process.env.GROQ_API_KEY || '',
        model: saved.groq?.model || base.groq?.model || 'llama-3.3-70b-versatile'
      }
    };
  },

  setAiProvider(provider) {
    const p = provider.toLowerCase().trim();
    if (!['gemini', 'openai', 'groq'].includes(p)) return false;
    const settings = loadJSON(SETTINGS_FILE, {});
    if (!settings.aiConfig) settings.aiConfig = {};
    settings.aiConfig.activeProvider = p;
    saveJSON(SETTINGS_FILE, settings);
    return true;
  },

  setAiKey(provider, key) {
    const p = provider.toLowerCase().trim();
    if (!['gemini', 'openai', 'groq'].includes(p)) return false;
    const settings = loadJSON(SETTINGS_FILE, {});
    if (!settings.aiConfig) settings.aiConfig = {};
    if (!settings.aiConfig[p]) settings.aiConfig[p] = {};
    settings.aiConfig[p].apiKey = key.trim();
    saveJSON(SETTINGS_FILE, settings);
    return true;
  },

  setAiModel(provider, model) {
    const p = provider.toLowerCase().trim();
    if (!['gemini', 'openai', 'groq'].includes(p)) return false;
    const settings = loadJSON(SETTINGS_FILE, {});
    if (!settings.aiConfig) settings.aiConfig = {};
    if (!settings.aiConfig[p]) settings.aiConfig[p] = {};
    settings.aiConfig[p].model = model.trim();
    saveJSON(SETTINGS_FILE, settings);
    return true;
  },

  // AI Toggle Controls per chat or globally
  isAiPaused(jid) {
    const settings = loadJSON(SETTINGS_FILE, { isGlobalAiEnabled: true, pausedChats: {} });
    if (!settings.isGlobalAiEnabled) return true;
    const cleanJid = jid.split('@')[0].replace(/\D/g, '');
    return !!settings.pausedChats[cleanJid];
  },

  pauseAi(jid) {
    const settings = loadJSON(SETTINGS_FILE, { isGlobalAiEnabled: true, pausedChats: {} });
    const cleanJid = jid.split('@')[0].replace(/\D/g, '');
    settings.pausedChats[cleanJid] = new Date().toISOString();
    saveJSON(SETTINGS_FILE, settings);
  },

  resumeAi(jid) {
    const settings = loadJSON(SETTINGS_FILE, { isGlobalAiEnabled: true, pausedChats: {} });
    const cleanJid = jid.split('@')[0].replace(/\D/g, '');
    delete settings.pausedChats[cleanJid];
    saveJSON(SETTINGS_FILE, settings);
  },

  setGlobalAi(enabled) {
    const settings = loadJSON(SETTINGS_FILE, { isGlobalAiEnabled: true, pausedChats: {} });
    settings.isGlobalAiEnabled = !!enabled;
    saveJSON(SETTINGS_FILE, settings);
  },

  getSettings() {
    return loadJSON(SETTINGS_FILE, { isGlobalAiEnabled: true, pausedChats: {} });
  }
};

export default crm;
