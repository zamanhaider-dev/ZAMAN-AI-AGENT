/* ⚡ ZAMAN AI ASSISTANT — MULTI-PROVIDER AI CONVERSATION ENGINE (GEMINI, OPENAI, GROQ) ⚡ */

import axios from 'axios';
import config from '../config.js';
import crm from './leadCrm.js';

// Fallback consultative response when offline or before API key setup
function localConsultantResponse(userMessage, chatHistory = [], userName = 'Friend') {
  const text = (userMessage || '').toLowerCase();
  const isRomanUrdu = /bhai|kya|mujhe|chahiye|kitna|hoga|kese|kaise|karo|acha|theek|walay|krna|banwana|pesay|paisa|rate|rabta|shukriya|salam|karo/i.test(text);

  if (/salam|hello|hi|hey|aoa|aslam/i.test(text)) {
    if (isRomanUrdu) {
      return `Wa Alaikum Assalam! 👋\n\nMain Zaman Haider ka AI Assistant hoon. Zaman custom AI Agents aur WhatsApp automations banate hain.\n\nAapko kis type ka project ya bot banwana hai? Brief details batayein taake main guide kar sakoon.`;
    }
    return `Hello! 👋\n\nI am Zaman Haider's AI Assistant. Zaman builds custom AI agents and workflow automations.\n\nCould you please share a few details about what you're looking to build?`;
  }

  if (/cost|price|pricing|rate|kitna|pesay|paisa|budget|quote/i.test(text)) {
    if (isRomanUrdu) {
      return `*Pricing & Scope:*\nCost project ke features aur complexity par depend karti hai:\n• Simple WhatsApp Bot: Quick turnaround\n• Custom AI Agent (Memory + Tools): Feature-based\n• Full Business Automation: Custom package\n\nAap requirements share karein, Zaman review karke timeline aur budget quote karenge!`;
    }
    return `*Pricing & Scope:*\nPricing depends on your required features:\n• Custom WhatsApp Bot / Flow: Fast delivery\n• AI Agent (LLM + Integrations): Scope-based\n• Full Automation Pipeline: Custom quote\n\nPlease share your requirements so Zaman can provide an accurate quote and timeline.`;
  }

  if (/portfolio|work|sample|demo|previous|pehle|kya banaya/i.test(text)) {
    if (isRomanUrdu) {
      return `Aap portfolio aur live work yahan dekh sakte hain:\n🔗 *Portfolio:* ${config.owner.portfolioUrl}\n💼 *Catalog:* ${config.owner.catalogUrl}`;
    }
    return `You can check Zaman's portfolio and projects here:\n🔗 *Portfolio:* ${config.owner.portfolioUrl}\n💼 *Catalog:* ${config.owner.catalogUrl}`;
  }

  if (/talk|call|meet|direct|urgent|baat|call karni|zaman se/i.test(text)) {
    if (isRomanUrdu) {
      return `Aap "Chat with Zaman" button par click kar dein ya "TALK TO ZAMAN" reply karein. Main Zaman ko foran alert bhej deta hoon taake wo aapse direct baat kar sakein.`;
    }
    return `You can tap "Chat with Zaman" or reply "TALK TO ZAMAN". I will notify Zaman right away so he can connect with you directly.`;
  }

  if (isRomanUrdu) {
    return `Aapki requirement note kar li hai: "${userMessage}".\n\nIs project ke liye WhatsApp ke ilawa koi aur tool ya database connect karna hai? Aur target deadline kya hai?`;
  }

  return `Noted your inquiry regarding: "${userMessage}".\n\nDoes this require integration with external tools (CRMs, Google Sheets, or APIs), and what is your expected timeline?`;
}

// 1. Google Gemini Provider Call
async function callGemini(apiKey, model, systemPrompt, history, userMessage) {
  const formattedContents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I am Zaman Haider\'s AI Assistant. I will follow all instructions and tone rules strictly.' }] }
  ];

  history.slice(-8).forEach(h => {
    formattedContents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    });
  });

  formattedContents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await axios.post(
    endpoint,
    {
      contents: formattedContents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
    },
    { timeout: 14000, headers: { 'Content-Type': 'application/json' } }
  );

  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

// 2. OpenAI / Groq Compatible Chat Provider Call
async function callOpenAICompatible(apiUrl, apiKey, model, systemPrompt, history, userMessage) {
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  history.slice(-8).forEach(h => {
    messages.push({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content
    });
  });

  messages.push({ role: 'user', content: userMessage });

  const res = await axios.post(
    apiUrl,
    {
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 600
    },
    {
      timeout: 14000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }
  );

  return res.data?.choices?.[0]?.message?.content?.trim();
}

export async function generateAiReply(userJid, userMessage, userName = 'Friend') {
  const history = crm.getChatHistory(userJid);
  const aiConfig = crm.getAiConfig();
  const systemPrompt = crm.getMasterPrompt();
  const provider = aiConfig.activeProvider || 'gemini';

  try {
    let reply = '';

    if (provider === 'gemini') {
      const { apiKey, model } = aiConfig.gemini;
      if (!apiKey) throw new Error('Gemini API key is not configured');
      reply = await callGemini(apiKey, model, systemPrompt, history, userMessage);
    } else if (provider === 'openai') {
      const { apiKey, model } = aiConfig.openai;
      if (!apiKey) throw new Error('OpenAI API key is not configured');
      reply = await callOpenAICompatible('https://api.openai.com/v1/chat/completions', apiKey, model, systemPrompt, history, userMessage);
    } else if (provider === 'groq') {
      const { apiKey, model } = aiConfig.groq;
      if (!apiKey) throw new Error('Groq API key is not configured');
      reply = await callOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', apiKey, model, systemPrompt, history, userMessage);
    }

    if (reply) {
      crm.recordMessage(userJid, 'user', userMessage);
      crm.recordMessage(userJid, 'assistant', reply);
      return reply;
    }

    throw new Error('Empty AI response from provider');
  } catch (err) {
    console.warn(`[AI-ENGINE] ${provider.toUpperCase()} failed (${err.message}). Using local consultant fallback.`);
    const fallbackReply = localConsultantResponse(userMessage, history, userName);
    crm.recordMessage(userJid, 'user', userMessage);
    crm.recordMessage(userJid, 'assistant', fallbackReply);
    return fallbackReply;
  }
}

export async function transcribeAudio(audioBuffer, mimeType = 'audio/ogg') {
  const aiConfig = crm.getAiConfig();
  const cleanMime = (mimeType || 'audio/ogg').split(';')[0].trim();

  // 1. Try Google Gemini 1.5 Flash (Native multilingual speech recognition)
  if (aiConfig.gemini?.apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiConfig.gemini.apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text: "Transcribe this audio message verbatim. The speaker may be speaking in Roman Urdu, Urdu, Hindi, Punjabi, or English. Return ONLY the transcribed text. Do not add quotes, markdown formatting, or explanations."
              },
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: audioBuffer.toString('base64')
                }
              }
            ]
          }
        ]
      };

      const res = await axios.post(endpoint, payload, {
        timeout: 20000,
        headers: { 'Content-Type': 'application/json' }
      });

      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text;
    } catch (e) {
      console.warn('[TRANSCRIBE] Gemini transcription failed:', e.message);
    }
  }

  // 2. Try Groq Whisper (Whisper-large-v3)
  if (aiConfig.groq?.apiKey) {
    try {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('file', audioBuffer, { filename: 'audio.ogg', contentType: cleanMime });
      form.append('model', 'whisper-large-v3');

      const res = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${aiConfig.groq.apiKey}`
        },
        timeout: 20000
      });

      const text = res.data?.text?.trim();
      if (text) return text;
    } catch (e) {
      console.warn('[TRANSCRIBE] Groq Whisper failed:', e.message);
    }
  }

  // 3. Try OpenAI Whisper
  if (aiConfig.openai?.apiKey) {
    try {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('file', audioBuffer, { filename: 'audio.ogg', contentType: cleanMime });
      form.append('model', 'whisper-1');

      const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${aiConfig.openai.apiKey}`
        },
        timeout: 20000
      });

      const text = res.data?.text?.trim();
      if (text) return text;
    } catch (e) {
      console.warn('[TRANSCRIBE] OpenAI Whisper failed:', e.message);
    }
  }

  return null;
}

export default {
  generateAiReply,
  transcribeAudio
};
