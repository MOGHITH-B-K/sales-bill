
import { createClient } from '@supabase/supabase-js';

// Access environment variables directly or use the provided credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://peugomttfkbawdnwdhis.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_NBY5lR6y__SoqsUHtlA1gQ_JcbmG299';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase URL or Key is missing. Check your .env file.");
}

// Initialize the client with your specific project details
export const supabase = createClient(
  supabaseUrl, 
  supabaseKey
);
