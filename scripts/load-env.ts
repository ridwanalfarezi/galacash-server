import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const configuredEnvPath = process.env.DOTENV_CONFIG_PATH;
const defaultEnvPath = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
const envPath = path.resolve(configuredEnvPath || defaultEnvPath);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}