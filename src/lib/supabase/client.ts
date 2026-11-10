import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables for browser client");
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseKey);
  }

  return browserClient;
};
