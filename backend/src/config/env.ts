import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "super-secret-key",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/sih_db",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  llm: {
    apiBase: process.env.LLM_API_BASE || "",
    apiKey: process.env.LLM_API_KEY || "",
    modelName: process.env.LLM_MODEL_NAME || "",
    fallbackModels: process.env.LLM_FALLBACK_MODELS || "",
  },
  fabric: {
    mspId: process.env.FABRIC_MSP_ID || "Org1MSP",
    channelName: process.env.FABRIC_CHANNEL || "identity-channel",
    chaincodeName: process.env.FABRIC_CHAINCODE || "audit-contract",
  }
};
