/**
 * GullyTutor — Supabase Client
 * Single source of truth for the Supabase connection.
 * Loaded first via <script> tag on every page.
 */

const SUPABASE_URL = 'https://fhjjwqmptrytnjcpulxu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wv2sbgbxWoNePCbOfBMyfQ_E_HS2zis';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
