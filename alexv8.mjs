import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import fs from "node:fs";
import path from "node:path";

const PREFIX = process.env.BOT_PREFIX || "!";
const AUTH_DIR = process.env.AUTH_DIR || "./data/auth";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

fs.mkdirSync(AUTH_DIR, { recursive: true });

const logger = pino({ level: LOG_LEVEL });
const lastCommandAt = new Map();
let isStarting = false;
let stopping = false;

function getMessageText(message) {
  let content = message?.message;
  if (!content) return "";

  // Unwrap common WhatsApp message wrappers.
  content =
    content.ephemeralMessage?.message ??
    content.viewOnceMessage?.message ??
    content.viewOnceMessageV2?.message ??
    content;

  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    ""
  ).trim();
}

function getSender(message) {
  return message.key.participant || message.key.remoteJid || "unknown";
}

function shouldProcess(message) {
  const jid = message.key.remoteJid || "";
  return (
    !message.key.fromMe &&
    jid !== "status@broadcast" &&
    !jid.endsWith("@broadcast") &&
    Boolean(getMessageText(message))
  );
}

function isRateLimited(jid) {
  const now = Date.now();
  const previous = lastCommandAt.get(jid) || 0;
  if (now - previous < 1200) return true;
  lastCommandAt.set(jid, now);

  // Keep the in-memory map bounded.
  if (lastCommandAt.size > 2000) {
    for (const [key, timestamp] of lastCommandAt) {
      if (now - timestamp > 60_000) lastCommandAt.delete(key);
    }
  }
  return false;
}

async function handleMessage(sock, message) {
  if (!shouldProcess(message)) return;

  const chatJid = message.key.remoteJid;
  const text = getMessageText(message);
  if (!text.startsWith(PREFIX)) return;
  if (isRateLimited(chatJid)) return;

  const [rawCommand, ...args] = text.slice(PREFIX.length).trim().split(/\s+/);
  const command = (rawCommand || "").toLowerCase();

  let response;
  switch (command) {
    case "ping":
      response = "🏓 Pong! Bot is online.";
      break;

    case "menu":
    case "help":
      response = [
        "⚡ *ALEX BOT — MENU*",
        "",
        `• ${PREFIX}ping — check bot status`,
        `• ${PREFIX}time — show server time (UTC)`,
        `• ${PREFIX}id — show this chat ID`,
        `• ${PREFIX}about — bot information`,
        `• ${PREFIX}menu — show this menu`,
        "",
        "This starter responds only to explicit commands."
      ].join("\n");
      break;

    case "time":
      response = `🕒 Server time: ${new Date().toISOString()}`;
      break;

    case "id":
      response = `Chat ID: ${chatJid}\nSender: ${getSender(message)}`;
      break;

    case "about":
      response = [
        "*ALEX BOT*",
        "A lightweight WhatsApp bot running on Railway.",
        "No bulk messaging, target spam, or automated group modification."
      ].join("\n");
      break;

    default:
      // Unknown commands are ignored to avoid unsolicited replies.
      return;
  }

  await sock.sendMessage(chatJid, { text: response }, { quoted: message });
}

async function startBot() {
  if (isStarting || stopping) return;
  isStarting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
      auth: state,
      logger,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("\nScan this QR code with WhatsApp → Linked devices:\n");
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        console.log("✅ WhatsApp bot connected successfully.");
      }

      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ??
          lastDisconnect?.error?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          console.error(
            "WhatsApp session logged out. Remove the saved auth folder from the Railway volume and redeploy to pair again."
          );
          stopping = true;
          process.exitCode = 1;
          return;
        }

        console.log("WhatsApp connection closed. Reconnecting...");
        setTimeout(() => {
          isStarting = false;
          startBot().catch((error) => logger.error(error, "Reconnect failed"));
        }, 3000);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const message of messages) {
        try {
          await handleMessage(sock, message);
        } catch (error) {
          logger.error(error, "Message handler error");
        }
      }
    });

    isStarting = false;
  } catch (error) {
    isStarting = false;
    logger.error(error, "Bot startup failed");
    setTimeout(() => startBot(), 5000);
  }
}

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`Received ${signal}; shutting down.`);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log("Starting ALEX BOT...");
console.log(`Command prefix: ${PREFIX}`);
console.log(`Auth directory: ${path.resolve(AUTH_DIR)}`);
startBot();
