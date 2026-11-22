/* ⚡ ZAMAN HAIDER — EXECUTIVE AI BUSINESS ASSISTANT CONFIGURATION ⚡ */

import 'dotenv/config';

export default {
  // Owner Credentials & Profile
  owner: {
    name: process.env.OWNER_NAME || "Zaman Haider",
    number: (process.env.OWNER_NUMBER || "923215372647").replace(/\D/g, ''), // Zaman Haider's WhatsApp Number
    role: process.env.OWNER_ROLE || "AI Automation Specialist",
    title: process.env.OWNER_TITLE || "Innovate • Automate • Scale",
    company: process.env.OWNER_COMPANY || "Zaman AI",
    email: process.env.OWNER_EMAIL || "Zamanhaider.ai@gmail.com",
    portfolioUrl: process.env.PORTFOLIO_URL || "https://www.zamanhaider.site", // Portfolio Link from banner
    catalogUrl: process.env.CATALOG_URL || "https://wa.me/c/923215372647", // WhatsApp Business Catalog
    bannerImage: process.env.BANNER_IMAGE || "./assets/zaman_haider.jpg", // Official profile card image
  },

  // Assistant Configuration
  assistant: {
    name: process.env.ASSISTANT_NAME || "Assistant",
    version: "2.0.0",
    timezone: process.env.TIMEZONE || "Asia/Karachi",
    welcomeHeader: process.env.WELCOME_HEADER || "ZAMAN HAIDER | AI AUTOMATION",
    statusBio: process.env.STATUS_BIO || "AI Assistant to Zaman Haider • Innovate • Automate • Scale",
  },

  // Services & Offerings (for Consultation & Catalog)
  services: [
    {
      title: "Custom AI Agents",
      desc: "Conversational and task-execution agents for customer support, lead qualification, and workflows.",
      features: ["Multi-turn Memory", "CRM Sync", "Multi-lingual Support"]
    },
    {
      title: "Business Automations",
      desc: "End-to-end pipeline automation connecting WhatsApp, CRMs, Google Sheets, APIs, and Webhooks.",
      features: ["n8n & Make Workflows", "Instant Alerts", "Automated Follow-ups"]
    },
    {
      title: "WhatsApp & Platform Bots",
      desc: "Production-grade WhatsApp Business bots, Telegram bots, and custom Baileys integrations.",
      features: ["Interactive Buttons", "Catalogs", "Group Management"]
    },
    {
      title: "Web Scraping & Data Pipelines",
      desc: "Automated real-time data extractors, competitor tracking, and structured reporting.",
      features: ["Cloud deployment", "Structured exports"]
    }
  ],

  // System & Database Settings
  database: {
    contactsFile: "./database/contacts.json",
    chatsFile: "./database/chatHistory.json",
    settingsFile: "./database/settings.json",
    groupsFile: "./database/groups.json",
  },

  // Multi-Provider AI Engine (Gemini, OpenAI, Groq)
  ai: {
    activeProvider: process.env.AI_PROVIDER || "gemini", // 'gemini' | 'openai' | 'groq'
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || "",
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || "",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    }
  },

  // Sessions Folder
  sessionsDir: process.env.SESSIONS_DIR || "./Sessions",
};
