/**
 * GullyTutor - Supabase Connection Initialization
 */
const SUPABASE_URL = 'https://eckujckouvgculrjuoqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVja3VqY2tvdXZnY3Vscmp1b3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjkyOTMsImV4cCI6MjA4ODMwNTI5M30.LonVmSJ5MS2EJHYw19Xk9QPsKfRnNkD1mE9l2GL7Sc8';

// Use a more robust initialization with fallback
let supabaseInstance;
try {
    // Check for global 'supabase' from CDN
    if (typeof supabase !== 'undefined') {
        supabaseInstance = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (window.supabase) {
        supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("Supabase library not found. Ensure CDN script is loaded correctly.");
    }
} catch (err) {
    console.error("Failed to initialize Supabase:", err);
}

window.supabaseClient = supabaseInstance;
console.log("Supabase Client Initialized:", !!window.supabaseClient);
