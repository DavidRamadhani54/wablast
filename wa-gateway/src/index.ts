import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import moment from "moment";
import { globalErrorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notfound.middleware";
import { serve } from "@hono/node-server";
import { env } from "./env";
import { createSessionController } from "./controllers/session";
import * as whastapp from "wa-multi-session";
import { createMessageController } from "./controllers/message";
import { CreateWebhookProps } from "./webhooks";
import { createWebhookMessage } from "./webhooks/message";
import { createWebhookSession } from "./webhooks/session";
import { createProfileController } from "./controllers/profile";
import { createContactController } from "./controllers/contact";
import { serveStatic } from "@hono/node-server/serve-static";
import { getPool } from "./db/connection";

const app = new Hono();

app.use(
  logger((...params) => {
    params.map((e) => console.log(`${moment().toISOString()} | ${e}`));
  })
);

// Enhanced CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.onError(globalErrorMiddleware);
app.notFound(notFoundMiddleware);

// Test database connection on startup
async function initializeDatabase() {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Database initialized successfully at:", result.rows[0].now);
  } catch (error) {
    console.error(
      "❌ Database initialization failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

/**
 * serve media message static files
 */
app.use(
  "/media/*",
  serveStatic({
    root: "./",
  })
);

/**
 * Health check endpoint
 */
app.get("/health", async (c) => {
  try {
    const pool = getPool();
    const dbResult = await pool.query("SELECT NOW()");
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      dbTime: dbResult.rows[0].now,
    });
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

/**
 * session routes
 */
app.route("/session", createSessionController());
/**
 * message routes
 */
app.route("/message", createMessageController());
/**
 * profile routes
 */
app.route("/profile", createProfileController());
/**
 * contact routes
 */
app.route("/contact", createContactController());

const port = env.PORT;

// Initialize database first
initializeDatabase()
  .then(() => {
    serve(
      {
        fetch: app.fetch,
        port,
      },
      (info) => {
        console.log(`🚀 Server is running on http://localhost:${info.port}`);
        console.log(`📊 Health check: http://localhost:${info.port}/health`);
        console.log(`📱 Contacts API: http://localhost:${info.port}/contact`);
      }
    );
  })
  .catch((error) => {
    console.error(
      "❌ Failed to start server:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  });

whastapp.onConnected((session) => {
  console.log(`session: '${session}' connected`);
});

// Implement Webhook
if (env.WEBHOOK_BASE_URL) {
  const webhookProps: CreateWebhookProps = {
    baseUrl: env.WEBHOOK_BASE_URL,
  };

  // message webhook
  whastapp.onMessageReceived(createWebhookMessage(webhookProps));

  // session webhook
  const webhookSession = createWebhookSession(webhookProps);

  whastapp.onConnected((session) => {
    console.log(`session: '${session}' connected`);
    webhookSession({ session, status: "connected" });
  });
  whastapp.onConnecting((session) => {
    console.log(`session: '${session}' connecting`);
    webhookSession({ session, status: "connecting" });
  });
  whastapp.onDisconnected((session) => {
    console.log(`session: '${session}' disconnected`);
    webhookSession({ session, status: "disconnected" });
  });
}
// End Implement Webhook

whastapp.loadSessionsFromStorage();
