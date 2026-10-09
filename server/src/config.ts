import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GOOGLE_CLOUD_PROJECT: z.string().min(1).default('prompt-war-dypcoei'),
  GOOGLE_CLOUD_LOCATION: z.string().min(1).default('global'),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.7-flash'),
  MAPS_SERVER_KEY: z.string().default(''),
  VITE_MAPS_BROWSER_KEY: z.string().default(''),
  REPORT_STORE: z.enum(['firestore', 'memory']).default('firestore'),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return EnvSchema.parse(env);
}
