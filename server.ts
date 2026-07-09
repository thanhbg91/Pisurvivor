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

// Endpoint to check backend PI_API_KEY integration status securely
app.get("/api/pi/status", (req, res) => {
  res.json({
    success: true,
    configured: !!process.env.PI_API_KEY,
    sandbox: process.env.VITE_PI_SANDBOX !== "false",
  });
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

// 0. AUTHENTICATE / VALIDATE user endpoint
app.post("/api/pi/authenticate", async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "accessToken is required" });
    }

    console.log(`[Pi Backend] Validating pioneer access token against Pi Platform API...`);
    const response = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Pi Backend] Pi Platform API token validation failed (status ${response.status}): ${errorText}`);
      return res.status(response.status).json({ error: `Pi Network API token validation failed: ${errorText}` });
    }

    const userData = await response.json();
    console.log("[Pi Backend] Pioneer validation successful. User data:", userData);

    res.json({ success: true, user: userData });
  } catch (error: any) {
    console.error("[Pi Backend] Exception during user authentication:", error.message);
    res.status(500).json({ error: error.message });
  }
});

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

// 3. SELL coins (App-to-User payment) endpoint
app.post("/api/pi/sell", async (req, res) => {
  try {
    const { uid, username, amountCoins, piAmount } = req.body;
    if (!uid || !amountCoins || !piAmount) {
      return res.status(400).json({ error: "Missing uid, amountCoins, or piAmount" });
    }

    console.log(`[Pi Backend] Process sell request: Pioneer @${username || uid} wants to sell ${amountCoins} xu for ${piAmount} Pi`);

    // Verify if API Key is configured
    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      console.log(`[Pi Backend] PI_API_KEY is not configured. Simulating transaction on sandbox/test mode.`);
      return res.json({
        success: true,
        simulated: true,
        message: "No PI_API_KEY configured. Transaction simulated successfully.",
        amountCoins,
        piAmount
      });
    }

    // Try to perform a real App-to-User payment on Pi Platform API
    try {
      console.log(`[Pi Backend] Requesting Pi Platform to create App-to-User payment...`);
      const paymentResponse = await callPiApi("/v2/payments", "POST", {
        payment: {
          amount: piAmount,
          memo: `Thanh toan doi ${amountCoins} Xu sang Pi cho Pioneer ${username || uid}`,
          metadata: { type: "sell_xu", xuAmount: amountCoins },
          uid: uid
        }
      });

      console.log(`[Pi Backend] App-to-User payment created on Pi API:`, paymentResponse);

      const walletSeed = process.env.PI_WALLET_SEED;
      if (!walletSeed) {
        console.warn(`[Pi Backend] PI_WALLET_SEED is not configured. App cannot automatically sign the transaction.`);
        return res.json({
          success: true,
          simulated: true,
          message: "Payment created on Pi Platform, but PI_WALLET_SEED is missing to complete blockchain signing automatically. Simulated transaction.",
          payment: paymentResponse
        });
      }

      res.json({
        success: true,
        simulated: false,
        payment: paymentResponse
      });

    } catch (apiError: any) {
      console.warn(`[Pi Backend] Pi Platform API error, falling back to simulated transaction in Sandbox:`, apiError.message);
      res.json({
        success: true,
        simulated: true,
        message: `Simulation fallback: Pi Platform API returned: ${apiError.message}`,
        amountCoins,
        piAmount
      });
    }

  } catch (error: any) {
    console.error("[Pi Backend] Error processing sell request:", error.message);
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
