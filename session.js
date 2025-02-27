const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs");

async function generateSessionID() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");  
  const sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", async () => {
    await saveCreds();

    // `auth_info` ফোল্ডারে সংরক্ষিত সেশন ডাটা থেকে ID বের করা
    const sessionData = fs.readFileSync("auth_info/creds.json", "utf-8");
    const sessionID = Buffer.from(sessionData).toString("base64");

    console.log("✅ Your SESSION_ID:");
    console.log(sessionID);
    
    fs.writeFileSync("session_id.txt", sessionID); // সেশন আইডি ফাইল হিসাবে সংরক্ষণ
    process.exit(0);
  });

  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") {
      console.log("✅ WhatsApp Connected! Generating SESSION_ID...");
    } else if (connection === "close") {
      console.log("❌ Disconnected! Try again.");
    }
  });
}

generateSessionID();
