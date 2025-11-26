// Supabase client initialization
// Note: In production, prefer hiding keys via server or env.

const SUPABASE_URL = "https://zkpoqhkjblczwdlhjwwn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcG9xaGtqYmxjendkbGhqd3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDM5NDgsImV4cCI6MjA3OTU3OTk0OH0.UDtUVdLRnbuVi69LBkQ_UoyHQI9qjgDSrf9gVqQur4Q";

// Aguardar o Supabase estar disponível e inicializar
(function initSupabase() {
  if (typeof window.supabase !== 'undefined') {
    // Global client (using UMD script of supabase-js)
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.SUPABASE_URL = SUPABASE_URL;
    
    // Disparar evento customizado para notificar que o Supabase está pronto
    window.dispatchEvent(new Event('supabaseReady'));
  } else {
    // Tentar novamente em 100ms
    setTimeout(initSupabase, 100);
  }
})();

// Helper to build public storage URL for a file in the bucket
window.storagePublicUrl = function storagePublicUrl(path) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/imagens_cardapio/${path}`;
};
