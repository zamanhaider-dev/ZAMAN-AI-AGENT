# ⚡ ZAMAN AI ASSISTANT — Executive WhatsApp Business Agent

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys Multi-Device](https://img.shields.io/badge/Baileys-Multi--Device-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![AI Engine](https://img.shields.io/badge/AI%20Providers-Gemini%20%7C%20OpenAI%20%7C%20Groq-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

An enterprise-grade, autonomous WhatsApp Business AI Agent built for **Zaman Haider (AI Automation Specialist)**. Designed with multi-provider LLM intelligence (Google Gemini, OpenAI, Groq), built-in client lead CRM, voice note speech recognition, interactive visual image cards, and anti-ban human behavior emulation.

---

## 🌟 Key Architecture & Features

### 1. 🤖 Multi-Provider AI Engine (Dynamic Failover)
- Seamlessly switches between:
  - **Google Gemini 1.5 Flash** (Primary fast conversational model)
  - **OpenAI GPT-4o-mini** (Precision task execution & consultation)
  - **Groq LLaMA 3.3 70B** (Ultra-low latency open-source reasoning)
- **Local Fallback Engine**: If all API keys are unavailable, an embedded consultant rule-engine keeps replying to clients without interruption.

### 2. 🌐 Dynamic Multilingual Adaptive Matching
- Analyzes incoming messages and automatically replies in the user's language and tone:
  - **Roman Urdu** (`"bhai bot banwana hai, kitna kharcha hoga?"`)
  - **English** (`"Looking for an automated CRM pipeline."`)
  - **Urdu** (`"السلام علیکم، مجھے ایک پروجیکٹ کے بارے میں رہنمائی چاہیے۔"`)

### 3. 🎙️ Voice Note Transcription & Hands-Free Owner Controls
- Zaman Haider can speak directly to the bot using **WhatsApp Voice Notes**.
- Speech is automatically transcribed into text using **Gemini Multimodal Speech** or **Groq Whisper-large-v3**, allowing 100% hands-free task management, reminders, and broadcast dispatch.

### 4. 🛡️ Anti-Ban Telemetry & Human Behavior Emulation
- **Blue Tick Simulation**: Marks incoming messages as read before processing.
- **Dynamic Typing Simulation**: Calculates realistic typing intervals based on reply length (35ms per character with human variance).
- **Message Debouncing**: Combines rapid burst messages from clients into a single coherent prompt instead of multiple concurrent replies.
- **Throttled Broadcast Pipeline**: Staggers mass outbound messaging with random intervals (3.2s – 5.8s) to prevent spam flagging.

### 5. 👥 Embedded Lead CRM & WhatsApp Group Memory
- Automatically categorizes first-time contacts and captures initial inquiries.
- Tracks lead lifecycle status (`New Inquiry`, `Contacted`, `In Progress`, `Closed`).
- Logs all active participating WhatsApp groups, bot admin privileges, and group metadata.

### 6. ⚡ Interactive Visual Cards & Quick-Reply Buttons
- First-time clients receive an official visual image banner card (`zaman_haider.jpg`) with two native interactive buttons:
  - `💬 Chat with Zaman` (Sends instant priority notification to Zaman's phone)
  - `⚡ Services & Menu` (Displays the full catalog, portfolio link, and pricing structure)

### 7. 👑 Prefix-Less Master Owner Control Room
- Zaman Haider has complete operational control from his personal phone without needing special prefixes or commands like `.` or `!`.

---

## 📁 Project Structure

```text
ZAMAN-AI-AGENT/
├── assets/
│   └── zaman_haider.jpg          # Official card banner image
├── database/
│   ├── .gitkeep                  # Preserves database directory in Git
│   ├── contacts.json             # Lead CRM records
│   ├── chatHistory.json          # Multi-turn conversation memory
│   ├── groups.json               # Tracked WhatsApp group records
│   ├── notes.json                # Saved quick notes
│   ├── reminders.json            # Active scheduled reminders
│   ├── scheduled_messages.json   # Outbound scheduled broadcasts
│   ├── settings.json             # AI toggle & provider state
│   └── tasks.json                # To-do task items
├── lib/
│   ├── aiEngine.js               # Multi-provider LLM routing & Whisper STT
│   ├── antiBan.js                # Human presence, typing & jitter simulator
│   ├── cardBuilder.js            # Baileys native interactive card builder
│   ├── leadCrm.js                # CRM storage, lead validator & memory
│   ├── masterPrompt.js           # Core executive system prompt
│   ├── ownerControls.js          # Prefix-less owner command dispatcher
│   ├── scheduler.js              # Background cron dispatcher & time parser
│   └── simple.js                 # Message unwrapper & media downloader
├── .env.example                  # Environment configuration template
├── .gitignore                    # Prevents session & credential leakage
├── config.js                     # Centralized settings & profile config
├── ecosystem.config.cjs          # PM2 production process configuration
├── index.js                      # Main entrypoint & Baileys socket handler
└── package.json                  # Dependencies & execution scripts
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- An API Key from [Google AI Studio](https://aistudio.google.com/) or [Groq Cloud](https://console.groq.com/)

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/<your-username>/ZAMAN-AI-AGENT.git
cd ZAMAN-AI-AGENT
npm install
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```env
# AI Provider Configuration ('gemini' | 'openai' | 'groq')
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Owner Profile
OWNER_NAME="Zaman Haider"
OWNER_NUMBER=923215372647
PORTFOLIO_URL="https://www.zamanhaider.site"
CATALOG_URL="https://wa.me/c/923215372647"
```

### 4. Run the Agent

You can link via **Terminal QR Code** or **8-Digit Pairing Code**:

```bash
# Interactive selection prompt (QR or Pairing Code)
npm start

# Direct QR Code mode
npm run qr

# Direct 8-Digit Pairing Code mode
npm run code
```

#### How to Link with 8-Digit Pairing Code:
1. Run `npm run code`.
2. Enter your WhatsApp phone number (with country code, e.g. `923215372647`).
3. An 8-digit code (e.g. `ABCD-1234`) will appear in the terminal.
4. On your phone: Open **WhatsApp** > **Settings** > **Linked Devices** > **Link a Device** > **Link with phone number instead**.
5. Enter the code. Your AI agent is now online 24/7!

---

## 🕹️ Master Owner Commands Cheatsheet

All commands can be typed normally or sent via **Voice Note** from the owner's WhatsApp number:

| Category | Command Example | What It Does |
|---|---|---|
| **System Health** | `status` or `info` | View uptime, active AI provider, leads count, and pending tasks |
| **Lead CRM** | `leads` or `crm` | Lists recent client inquiries and contact details |
| **Groups** | `groups` | Lists all participating WhatsApp groups and bot admin status |
| **AI Settings** | `ai config` | Displays active provider (Gemini / OpenAI / Groq) and active model |
| **AI Switch** | `set provider: groq` | Dynamically switches AI engine between `gemini`, `openai`, `groq` |
| **API Keys** | `set gemini key: <key>` | Updates Gemini API key directly from WhatsApp chat |
| **Prompt Tuning** | `show prompt` | Displays current training prompt |
| **Prompt Tuning** | `set prompt: <text>` | Overwrites master prompt instructions on the fly |
| **Chat Controls** | `pause ai` / `resume ai` | Pauses auto-reply in current chat so you can speak manually |
| **Global AI** | `disable ai` / `enable ai` | Toggles AI auto-replies across all incoming chats |
| **Tasks** | `add task: Build CRM scraper` | Adds a new task to your personal to-do list |
| **Tasks** | `tasks` | Displays all pending tasks with numeric IDs |
| **Tasks** | `done task 1` | Marks task #1 as completed |
| **Notes** | `add note: Client needs n8n flow` | Saves a quick note into the database |
| **Notes** | `notes` | Displays all saved notes |
| **Reminders** | `remind me in 30 mins: Call client` | Sets natural language timer reminder |
| **Reminders** | `10 bjy yaad dilwana: Team meeting` | Sets Roman Urdu time-based reminder |
| **Scheduled Outbound** | `schedule to 923001234567 at 5 pm: Update` | Automatically sends message to client at specified time |
| **Status Update** | `post status: New AI Agent launched!` | Publishes an automated WhatsApp text status story |
| **Broadcast** | `broadcast contacts: Special offer` | Safely messages all registered CRM leads with anti-ban delay |

---

## 🛡️ Production Deployment (PM2)

For 24/7 uninterrupted cloud deployment on a VPS (Ubuntu / Debian / Windows Server):

```bash
# Install PM2 globally
npm install -g pm2

# Start the agent using ecosystem config
pm2 start ecosystem.config.cjs

# Save PM2 process list
pm2 save

# Setup PM2 auto-start on server reboot
pm2 startup
```

---

## 🔒 Security & Privacy Practices

- **Zero Credentials in Git**: Authentication keys and session tokens (`Sessions/`) are strictly excluded via `.gitignore`.
- **Sanitized Databases**: Client conversation records and phone numbers are excluded from Git commits.
- **Environment Isolation**: All sensitive credentials reside strictly in your local `.env` file.

---

## 📜 License & Author

- **Author**: **Zaman Haider**
- **Website**: [zamanhaider.site](https://www.zamanhaider.site)
- **WhatsApp**: [+92 321 5372647](https://wa.me/923215372647)
- **License**: MIT
