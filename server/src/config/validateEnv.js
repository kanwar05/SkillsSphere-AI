export const validateEnv = () => {
  const required = ["JWT_SECRET", "GOOGLE_CLIENT_ID"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("FATAL: Missing required environment variables:");
    missing.forEach((v) => console.error(`  - ${v}`));
    process.exit(1);
  }
};

export default validateEnv;
