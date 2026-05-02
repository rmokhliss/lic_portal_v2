// Auth.js v5 catch-all route handler. Tous les endpoints /api/auth/* sont
// gérés par les handlers exportés depuis infrastructure/auth.
import { handlers } from "@/server/infrastructure/auth";

export const { GET, POST } = handlers;
