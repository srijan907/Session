const express = require("express");
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs");
const qrcode = require("qrcode");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Static file serve for pair.html
app.use(express.static("public"));

// Function to generate a random pair code
function generatePairCode() {
    return crypto.randomBytes(3).toString("hex").toUpperCase(); // Example: A1B2C3
}

// Store sessions
const sessions = {};

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/pair.html");
});

app.get("/generate-session", async (req, res) => {
    try {
        const { state, saveCreds } = await useMultiFileAuthState("auth_info");
        const sock = makeWASocket({ auth: state });

        const pairCode = generatePairCode();
        sessions[pairCode] = { status: "waiting", session_id: null };

        sock.ev.on("creds.update", async () => {
            await saveCreds();
            const sessionData = fs.readFileSync("auth_info/creds.json", "utf-8");
            const sessionID = Buffer.from(sessionData).toString("base64");

            sessions[pairCode] = { status: "active", session_id: sessionID };
            fs.writeFileSync("session_id.txt", sessionID);

            res.json({ status: "success", pair_code: pairCode, session_id: sessionID });
            process.exit(0);
        });

        sock.ev.on("connection.update", async ({ qr }) => {
            if (qr) {
                const qrImage = await qrcode.toDataURL(qr);
                res.json({ status: "waiting_for_scan", qr: qrImage, pair_code: pairCode });
            }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.get("/get-session/:pairCode", (req, res) => {
    const pairCode = req.params.pairCode.toUpperCase();
    if (sessions[pairCode]) {
        res.json({ status: sessions[pairCode].status, session_id: sessions[pairCode].session_id });
    } else {
        res.status(404).json({ status: "error", message: "Invalid Pair Code" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
