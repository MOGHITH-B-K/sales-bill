import { createClient } from '@supabase/supabase-js';

// Access environment variables directly.
const envUrl = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_KEY;

// Use the provided credentials as the specific configuration
// This allows the app to work without a .env file locally using the user's specific database
const supabaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'https://peugomttfkbawdnwdhis.supabase.co';
const supabaseKey = envKey && envKey.length > 0 ? envKey : 'sb_publishable_NBY5lR6y__SoqsUHtlA1gQ_JcbmG299';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.log("Supabase keys missing. App initializing in Local Mode.");
} else {
  console.log("Initializing Supabase with cloud credentials.");
}

// Initialize the client
export const supabase = createClient(
  supabaseUrl, 
  supabaseKey
);