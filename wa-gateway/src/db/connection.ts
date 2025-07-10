import { Pool } from "pg";
import { env } from "../env";

let pool: Pool;

export const getPool = () => {
  if (!pool) {
    console.log("🔄 Initializing database connection...");
    console.log("Database config:", {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      // Don't log password for security
    });

    pool = new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      ssl:
        env.NODE_ENV === "PRODUCTION" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("connect", () => {
      console.log("✅ Database connected successfully");
    });

    pool.on("error", (err) => {
      console.error("❌ Database pool error:", err);
    });

    // Test connection immediately
    pool.connect((err, client, release) => {
      if (err) {
        console.error("❌ Database connection failed:", err);
      } else {
        console.log("✅ Database connection test successful");
        if (client) {
          client.query("SELECT NOW()", (err, result) => {
            release();
            if (err) {
              console.error("❌ Database query test failed:", err);
            } else {
              console.log("✅ Database query test successful:", result.rows[0]);
            }
          });
        }
      }
    });
  }
  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error("❌ Database query error:", error);
    console.error("Query:", text);
    console.error("Params:", params);
    throw error;
  } finally {
    client.release();
  }
};
