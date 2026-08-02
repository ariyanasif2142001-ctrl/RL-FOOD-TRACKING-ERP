import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      pos: [],
      users: [],
      auditLogs: [],
      deliveryNotes: [],
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return { pos: [], users: [], auditLogs: [], deliveryNotes: [] };
  }
}

function writeDb(data: any) {
  ensureDbFile();
  try {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // REST API Routes for Cross-Device Shared Storage
  app.get("/api/pos", (req, res) => {
    const db = readDb();
    res.json({ success: true, pos: db.pos || [] });
  });

  app.post("/api/pos", (req, res) => {
    const { pos } = req.body;
    if (!Array.isArray(pos)) {
      return res.status(400).json({ success: false, message: "Invalid PO list" });
    }
    const db = readDb();
    db.pos = pos;
    writeDb(db);
    res.json({ success: true, message: "POs saved to server", pos: db.pos });
  });

  app.get("/api/users", (req, res) => {
    const db = readDb();
    res.json({ success: true, users: db.users || [] });
  });

  app.post("/api/users", (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ success: false, message: "Invalid user list" });
    }
    const db = readDb();
    db.users = users;
    writeDb(db);
    res.json({ success: true, message: "Users saved to server", users: db.users });
  });

  app.get("/api/audit-logs", (req, res) => {
    const db = readDb();
    res.json({ success: true, logs: db.auditLogs || [] });
  });

  app.post("/api/audit-logs", (req, res) => {
    const { logs, log } = req.body;
    const db = readDb();
    if (Array.isArray(logs)) {
      db.auditLogs = logs;
    } else if (log) {
      if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
      db.auditLogs.unshift(log);
    }
    writeDb(db);
    res.json({ success: true, message: "Audit logs saved", logs: db.auditLogs });
  });

  app.get("/api/delivery-notes", (req, res) => {
    const db = readDb();
    res.json({ success: true, notes: db.deliveryNotes || [] });
  });

  app.post("/api/delivery-notes", (req, res) => {
    const { notes, note } = req.body;
    const db = readDb();
    if (Array.isArray(notes)) {
      db.deliveryNotes = notes;
    } else if (note) {
      if (!Array.isArray(db.deliveryNotes)) db.deliveryNotes = [];
      const idx = db.deliveryNotes.findIndex((n: any) => n.id === note.id);
      if (idx >= 0) {
        db.deliveryNotes[idx] = note;
      } else {
        db.deliveryNotes.unshift(note);
      }
    }
    writeDb(db);
    res.json({ success: true, message: "Delivery notes saved", notes: db.deliveryNotes });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
