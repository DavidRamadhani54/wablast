import "dotenv/config";
import { z } from "zod";

export const env = z
  .object({
    NODE_ENV: z.enum(["DEVELOPMENT", "PRODUCTION"]).default("DEVELOPMENT"),
    KEY: z.string().default(""),
    PORT: z
      .string()
      .default("5001")
      .transform((e) => Number(e)),
    WEBHOOK_BASE_URL: z.string().optional(),
    // Database config
    DB_HOST: z.string().default("host"),
    DB_PORT: z
      .string()
      .default("port")
      .transform((e) => Number(e)),
    DB_NAME: z.string().default("dbname"),
    DB_USER: z.string().default("user"),
    DB_PASSWORD: z.string().default("password"),
  })
  .parse(process.env);

// Log configuration (without password)
console.log("🔧 Environment Configuration:");
console.log("NODE_ENV:", env.NODE_ENV);
console.log("PORT:", env.PORT);
console.log("DB_HOST:", env.DB_HOST);
console.log("DB_PORT:", env.DB_PORT);
console.log("DB_NAME:", env.DB_NAME);
console.log("DB_USER:", env.DB_USER);
console.log("DB_PASSWORD:", "***hidden***");
