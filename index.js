const express = require("express");
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("WhatsApp Session Generator API is Running!");
});

app.get("/generate-session", async (req, res) => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const sock = makeWASocket({ auth: state });

    sock.ev.on("creds.update", async () => {
      await saveCreds();
      const sessionData = fs.readFileSync("auth_info/creds.json", "utf-8");
      const sessionID = Buffer.from(sessionData).toString("base64");

      fs.writeFileSync("session_id.txt", sessionID); // লোকাল ফাইলে সেভ

      res.json({ status: "success", session_id: sessionID });
      process.exit(0);
    });

    sock.ev.on("connection.update", ({ connection }) => {
      if (connection === "open") {
        console.log("✅ WhatsApp Connected! Generating SESSION_ID...");
      }
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
