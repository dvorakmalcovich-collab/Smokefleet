import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Fix localhost DNS resolution
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve frontend assets
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite middleware for dev mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Standard static dist bundle representation
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Smokefleet Server] Running at: http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
