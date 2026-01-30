
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Ensure process.env is available for libraries that expect it
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || ''),
        SUPABASE_URL: JSON.stringify(env.SUPABASE_URL || 'https://peugomttfkbawdnwdhis.supabase.co'),
        SUPABASE_KEY: JSON.stringify(env.SUPABASE_KEY || 'sb_publishable_NBY5lR6y__SoqsUHtlA1gQ_JcbmG299')
      }
    },
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react', 'html2canvas'],
            'excel-vendor': ['xlsx', 'jszip']
          }
        }
      }
    }
  };
});
