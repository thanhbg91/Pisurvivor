import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files in public directory (like validation-key.txt)
app.use(express.static(path.join(process.cwd(), "public")));

// Standard API health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV });
});

// Helper function to call Pi Network Platform API
async function callPiApi(endpoint: string, method: string, body?: any) {
  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    throw new Error("PI_API_KEY is not configured in the server environment variables.");
  }

  const url = `https://api.minepi.com${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Key ${apiKey}`,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pi API returned status ${response.status}: ${errorText}`);
  }

  return response.json();
}

// 1. APPROVE payment endpoint
app.post("/api/pi/approve", async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: "paymentId is required" });
    }

    console.log(`[Pi Backend] Approving payment ${paymentId}...`);
    const result = await callPiApi(`/v2/payments/${paymentId}/approve`, "POST");
    console.log(`[Pi Backend] Payment ${paymentId} approved successfully:`, result);

    res.json({ success: true, result });
  } catch (error: any) {
    console.error("[Pi Backend] Error approving payment:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. COMPLETE payment endpoint
app.post("/api/pi/complete", async (req, res) => {
  try {
    const { paymentId, txid } = req.body;
    if (!paymentId || !txid) {
      return res.status(400).json({ error: "paymentId and txid are required" });
    }

    console.log(`[Pi Backend] Completing payment ${paymentId} with TX ${txid}...`);
    const result = await callPiApi(`/v2/payments/${paymentId}/complete`, "POST", { txid });
    console.log(`[Pi Backend] Payment ${paymentId} completed successfully:`, result);

    res.json({ success: true, result });
  } catch (error: any) {
    console.error("[Pi Backend] Error completing payment:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for dev or Static asset serving for production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

setupVite();
