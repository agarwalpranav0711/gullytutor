/**
 * GullyTutor — Auth Helper
 * Shared auth state management across all pages.
 * Include this after supabase.js on every HTML page.
 */

window.authHelper = {

  /**
   * Get the current logged-in user (or null)
   */
  async getUser() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    return user;
  },

  /**
   * Get the profile row from public.profiles
   */
  async getProfile() {
    const user = await this.getUser();
    if (!user) return null;

    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) return null;
    return data;
  },

  /**
   * Update nav buttons based on session state.
   * Looks for element with id="auth-nav-btns" on the page.
   */
  async updateNav() {
    const navEl = document.getElementById('auth-nav-btns');
    if (!navEl) return;

    const user = await this.getUser();
    if (!user) return; // already showing Login/Signup

    const profile = await this.getProfile();
    const name = profile?.first_name || user.user_metadata?.first_name || user.email.split('@')[0];
    const role = profile?.role || user.user_metadata?.role || 'student';
    const avatar = profile?.avatar_url
      ? `<img src="${profile.avatar_url}" class="w-8 h-8 rounded-full object-cover border-2 border-primary/20">`
      : `<div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">${name[0].toUpperCase()}</div>`;

    navEl.innerHTML = `
      <a href="dashboard.html" class="flex items-center gap-2 h-11 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all">
        ${avatar}
        <span class="text-sm font-bold text-slate-900 dark:text-white hidden sm:block">Hi, ${name} 👋</span>
      </a>
      ${role === 'tutor' ? `<a href="tutor-register.html" class="h-11 px-5 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-all hidden sm:flex items-center">My Profile</a>` : ''}
      <button onclick="window.authHelper.logout()" class="h-11 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-red-50 hover:text-red-500 transition-all">
        Log Out
      </button>
    `;
  },

  /**
   * Require login — redirect to home with modal open if not logged in
   */
  async requireLogin(redirectBack = true) {
    const user = await this.getUser();
    if (!user) {
      const returnUrl = redirectBack ? encodeURIComponent(window.location.href) : '';
      window.location.href = `index.html?openAuth=login&return=${returnUrl}`;
      return false;
    }
    return true;
  },

  /**
   * Log out
   */
  async logout() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  }
};

// Auto-update nav on every page load
document.addEventListener('DOMContentLoaded', () => {
  window.authHelper.updateNav();
});

// Listen for auth state changes (e.g. after Google OAuth redirect)
window.supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    window.authHelper.updateNav();
  } else if (event === 'SIGNED_OUT') {
    const navEl = document.getElementById('auth-nav-btns');
    if (navEl) {
      navEl.innerHTML = `
        <button onclick="openAuthModal('login')" class="h-11 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-200 transition-all">Log In</button>
        <button onclick="openAuthModal('signup')" class="h-11 px-6 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 shadow-lg shadow-primary/25 transition-all">Sign Up</button>
      `;
    }
  }
});
