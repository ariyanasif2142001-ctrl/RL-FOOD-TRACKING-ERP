import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // In-memory rate limiter for Gemini AI endpoints (max 20 requests / min / IP)
  interface RateLimitRecord {
    count: number;
    resetTime: number;
  }
  const geminiRateLimitStore = new Map<string, RateLimitRecord>();

  // Periodic cleanup of expired rate limit records
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of geminiRateLimitStore.entries()) {
      if (now > record.resetTime) {
        geminiRateLimitStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  const geminiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const ip = rawIp.split(',')[0].trim();
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 20;

    let record = geminiRateLimitStore.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      geminiRateLimitStore.set(ip, record);
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: "Too many AI requests from this IP. Please wait a minute and try again.",
        fallback: true
      });
    }

    record.count++;
    return next();
  };

  // Helper for Gemini AI client initialization
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // AI Executive Summary Endpoint
  app.post("/api/gemini/summary", geminiRateLimiter, async (req, res) => {
    try {
      const { datasetStats } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.status(503).json({ 
          error: "GEMINI_API_KEY environment variable is missing.",
          fallback: true
        });
      }

      const prompt = `System Instruction: You are an Executive Operations AI Assistant for "RL Food Purchase Tracking System".
Analyze the provided purchase order statistics and return a concise, professional, action-oriented executive summary in clear, professional English with bullet points and key metrics highlighted.

Dataset Context:
${JSON.stringify(datasetStats, null, 2)}

Provide the summary formatted in Markdown with:
1. 📊 **Executive Overview**
2. 🚚 **Status & Progress**
3. 🔒 **Hold Items & Risks**
4. 💡 **Actionable Recommendations**`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.log("[Gemini Summary: API unavailable or limit reached, using local fallback]");
      res.json({ 
        text: null,
        fallback: true
      });
    }
  });

  // AI Natural Language PO Query Endpoint
  app.post("/api/gemini/query", geminiRateLimiter, async (req, res) => {
    try {
      const { userQuery, datasetStats } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({ 
          text: null,
          fallback: true
        });
      }

      // Safeguard: Ensure masterSkuDatabase is capped at top 25 items max
      if (datasetStats && Array.isArray(datasetStats.masterSkuDatabase) && datasetStats.masterSkuDatabase.length > 25) {
        datasetStats.masterSkuDatabase = datasetStats.masterSkuDatabase.slice(0, 25);
      }

      const prompt = `System Instruction: You are an Operations AI Data Assistant for "RL Food Purchase Tracking System".

PRODUCT SKU PREFIX RULES:
1. "LP..." = Local Products (স্থানীয় পণ্য). If the user asks for local items or local side, prioritize SKUs starting with "LP".
2. "IP..." = Imported Products (আমদানিকৃত পণ্য). If the user asks for imported items, prioritize SKUs starting with "IP".
3. "VF..." = Vegetables & Fresh Produce (শাকসবজি / ফ্রেশ পোল্ট্রি-ভেজিটেবল). If the user asks for vegetables or fresh items, prioritize SKUs starting with "VF".

PROFIT & MARGIN CALCULATION RULES:
- Profit Amount per Unit = Selling Price - Cost Price (ONLY when both Cost Price and Selling Price are valid numbers > 0).
- Profit Margin % = ((Selling Price - Cost Price) / Cost Price) * 100
- Multiplier / Markup = Selling Price / Cost Price
- CRITICAL: Cost Price MUST be a valid number (> 0). NEVER treat missing/N/A Cost Price as 0 or calculate fake profit = Selling Price - 0! If Cost Price is 'N/A' or missing, state 'Cost Pending' and do NOT rank it as high profit!
- When the user asks for "top 10 profitable items", "most profitable products", "profit margin list", or "profit/loss", filter by prefix if specified (LP for local, IP for import, VF for vegetables), sort items with valid cost and selling prices by profit amount descending, and present the top 10 items clearly.

MULTILINGUAL RESPONSE REQUIREMENT:
You MUST respond in the EXACT same language, script, and dialect as the user's query:
- If query is in Bangla (বাংলা script), respond in clear Bangla (বাংলা).
- If query is in Banglish (Bangla in English/Latin letters, e.g. "koto dam", "lp item ache naki", "top 10 profitable item list dao", "profit % bolo"), respond in Banglish.
- If query is in Malayalam (മലയാളം script), respond in clear Malayalam (മലയാളം).
- If query is in English, respond in English.

ITEM PRICE, PROFIT & SKU INQUIRIES:
- CRITICAL SKU NUMBER SEARCH RULE: If the user query specifies a specific SKU number or SKU code (e.g. "LP001368", "001368", "IP000867", "VF000100"), you MUST ONLY show and discuss that specific matching SKU(s). Do NOT list other random products from the same category or prefix!
- SPELLING CORRECTION & FUZZY MATCHING: Users frequently make typos or spelling mistakes (e.g. "mayonise" -> "MAYONNAISE", "somaosa" -> "SAMOSA", "chiken" / "chikn" -> "CHICKEN", "almari" -> "ALMARAI"). You MUST automatically correct typos and fuzzy match products in "datasetStats.masterSkuDatabase".
- When you detect a spelling mistake in the user's search query, start your response with a gentle note: "🔍 *Showing results for **[CORRECTED NAME]** (searched: '[user query]')*".
- ONLY list items that match the product name (including fuzzy/corrected matches), keywords, SKU prefix, or profitability criteria in the user's question!
- If no match is found even after fuzzy matching, clearly state that no matching SKU was found in the requested language.

Format each matched item as:
• **SKU Name / Code:** \`[skuName]\`
  📦 **Item Name:** [itemName]
  💵 **Cost Price:** [costPrice] | 🏷️ **Selling Price:** [sellingPrice] ([unit])
  📈 **Profit / Unit:** +[profit] | 📊 **Margin:** [margin]%

Dataset Context:
${JSON.stringify(datasetStats, null, 2)}

User Question: "${userQuery}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.log("[Gemini Query: API unavailable or limit reached, using local fallback]");
      res.json({ 
        text: null,
        fallback: true
      });
    }
  });

  // Backend API proxy to safely fetch external Excel/CSV sheets (Dropbox, Google Sheets, etc.) without browser CORS issues
  app.get("/api/proxy-sheet", async (req, res) => {
    try {
      let targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ error: "Missing url query parameter" });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return res.status(400).json({ error: "URL domain not allowed" });
      }

      const allowedHostnames = new Set([
        'dropbox.com',
        'www.dropbox.com',
        'dl.dropboxusercontent.com',
        'docs.google.com',
        'drive.google.com',
        'sheets.googleapis.com',
        'script.google.com',
        'script.googleusercontent.com'
      ]);

      const hostname = parsedUrl.hostname.toLowerCase();
      if (!allowedHostnames.has(hostname)) {
        return res.status(400).json({ error: "URL domain not allowed" });
      }

      // Append cache buster parameter to bypass CDN/edge caching for Dropbox & Google Sheets
      const separator = targetUrl.includes('?') ? '&' : '?';
      const fetchUrl = `${targetUrl}${separator}_cb=${Date.now()}`;

      console.log(`[Proxy] Fetching external sheet from: ${fetchUrl}`);
      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache'
        },
        redirect: 'follow',
        cache: 'no-store'
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Remote server returned HTTP ${response.status}: ${response.statusText}` });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get("content-type") || "application/octet-stream";

      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", "attachment; filename=sheet.xlsx");
      res.send(buffer);
    } catch (err: any) {
      console.error("[Proxy] Error fetching remote file:", err);
      res.status(500).json({ error: err.message || "Failed to fetch remote file via server proxy" });
    }
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
