/**
 * GullyTutor - Supabase Connection Initialization
 */
const SUPABASE_URL = 'https://fhjjwqmptrytnjcpulxu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wv2sbgbxWoNePCbOfBMyfQ_E_HS2zis';

let supabaseInstance;
try {
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
