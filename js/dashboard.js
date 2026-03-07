/**
 * GullyTutor Dashboard Logic
 * Loads data based on the logged-in user's session — no URL params needed.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('inquiries-table');
    if (!tableBody) return;

    const viewsEl         = document.getElementById('total-views');
    const inquiriesCountEl = document.getElementById('new-inquiries');
    const conversionRateEl = document.getElementById('conversion-rate');
    const ratingEl        = document.getElementById('avg-rating');
    const nameSidebar     = document.getElementById('tutor-name-sidebar');
    const imgSidebar      = document.getElementById('tutor-img-sidebar');

    // ── 1. Get logged-in user ──
    const { data: { user } } = await window.supabaseClient.auth.getUser();

    if (!user) {
        // Not logged in — redirect to home with login modal
        window.location.href = 'index.html?openAuth=login&return=' + encodeURIComponent(window.location.href);
        return;
    }

    // ── 2. Load profile from DB ──
    const { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const firstName = profile?.first_name || user.user_metadata?.first_name || '';
    const lastName  = profile?.last_name  || user.user_metadata?.last_name  || '';
    const fullName  = (firstName + ' ' + lastName).trim() || user.email.split('@')[0];
    const role      = profile?.role || user.user_metadata?.role || 'student';

    if (nameSidebar) nameSidebar.textContent = fullName;
    if (imgSidebar) {
        imgSidebar.src = profile?.avatar_url || `https://i.pravatar.cc/100?u=${encodeURIComponent(user.email)}`;
    }

    // ── 3. Find tutor row linked to this user (if they're a tutor) ──
    let tutorId = null;
    let viewCount = 0;

    if (role === 'tutor') {
        const { data: tutorRow } = await window.supabaseClient
            .from('tutors')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tutorRow) {
            tutorId = tutorRow.id;
            viewCount = tutorRow.view_count || 0;
            animateValue(viewsEl, 0, viewCount, 1000);
            if (ratingEl) ratingEl.textContent = tutorRow.rating || '0.0';
            if (imgSidebar && tutorRow.image_url) imgSidebar.src = tutorRow.image_url;
        } else {
            // Tutor account but no listing yet
            if (viewsEl) viewsEl.textContent = '0';
            if (ratingEl) ratingEl.textContent = '0.0';
            showNoBioPrompt();
        }
    } else {
        // Student account — show student-friendly dashboard
        if (viewsEl) viewsEl.closest('.p-8').style.display = 'none';
        if (ratingEl) ratingEl.closest('.p-8').style.display = 'none';
        if (conversionRateEl) conversionRateEl.closest('.p-8').style.display = 'none';
        showStudentDashboard();
        return;
    }

    // ── 4. Load inquiries for this tutor ──
    await loadDashboardData(tutorId, viewCount);

    // ── 5. Realtime subscription for new inquiries ──
    if (tutorId) {
        const inquirySubscription = window.supabaseClient
            .channel('inquiries-channel')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'inquiries',
                filter: `tutor_id=eq.${tutorId}`
            }, () => {
                showToast('🔔 New Student Lead Received!');
                loadDashboardData(tutorId, viewCount);
            })
            .subscribe();

        window.addEventListener('beforeunload', () => {
            window.supabaseClient.removeChannel(inquirySubscription);
        });
    }

    // ── Core data loader ──
    async function loadDashboardData(tutorId, viewCount) {
        try {
            let inquiries = [];

            if (tutorId) {
                const { data, error } = await window.supabaseClient
                    .from('inquiries')
                    .select('*')
                    .eq('tutor_id', tutorId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                inquiries = data || [];
            }

            const inquiryCount = inquiries.length;
            animateValue(inquiriesCountEl, 0, inquiryCount, 1000);

            const conversionRate = viewCount > 0 ? Math.round((inquiryCount / viewCount) * 100) : 0;
            if (conversionRateEl) animateValue(conversionRateEl, 0, conversionRate, 1000, '%');

            renderInquiries(inquiries);

        } catch (err) {
            console.error('Dashboard error:', err);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-10 text-center text-red-500 font-bold">
                        Error loading data: ${err.message}
                    </td>
                </tr>`;
        }
    }

    // ── Render inquiries table ──
    function renderInquiries(inquiries) {
        if (!inquiries || inquiries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                        <div class="flex flex-col items-center gap-2">
                            <span class="material-symbols-outlined text-4xl opacity-20">inbox</span>
                            <p class="font-bold text-sm">No student inquiries yet</p>
                            <p class="text-[10px] uppercase tracking-widest opacity-60">Requests from students will appear here</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = inquiries.map(inquiry => {
            const dateStr = inquiry.created_at
                ? new Date(inquiry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'Just now';

            const name = inquiry.student_name || 'Anonymous Student';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const status = inquiry.status || 'new';
            const statusClass = status === 'new' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600';
            const statusDot = status === 'new' ? 'bg-blue-500' : 'bg-emerald-500';

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-5">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">${initials}</div>
                            <div>
                                <p class="text-sm font-bold text-slate-900">${name}</p>
                                <p class="text-[10px] text-slate-400">${inquiry.student_email || 'No email provided'}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-5">
                        <div class="text-sm text-slate-700 truncate max-w-[200px]">${inquiry.message || 'Interested in tuition classes.'}</div>
                    </td>
                    <td class="px-6 py-5 text-center">
                        <span class="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">Nearby</span>
                    </td>
                    <td class="px-6 py-5 text-xs text-slate-500">${dateStr}</td>
                    <td class="px-6 py-5">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${statusClass}">
                            <span class="w-1.5 h-1.5 rounded-full ${statusDot} mr-1.5"></span>
                            ${status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-5 text-right">
                        <button onclick="markReplied(${inquiry.id})" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-all" title="Mark as replied">
                            <span class="material-symbols-outlined text-[20px]">check_circle</span>
                        </button>
                    </td>
                </tr>`;
        }).join('');
    }

    // ── Show prompt for tutors without a listing ──
    function showNoBioPrompt() {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined text-4xl text-primary opacity-60">add_circle</span>
                        <p class="font-bold text-slate-800">You haven't created your tutor listing yet</p>
                        <a href="tutor-register.html" class="mt-2 px-6 py-2.5 bg-primary text-white text-sm font-black rounded-xl hover:brightness-110 transition-all">
                            Create Your Profile
                        </a>
                    </div>
                </td>
            </tr>`;
    }

    // ── Student dashboard message ──
    function showStudentDashboard() {
        const main = document.querySelector('main');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined text-4xl text-primary opacity-60">school</span>
                        <p class="font-bold text-slate-800">Welcome, ${fullName}! 👋</p>
                        <p class="text-sm text-slate-500">You're logged in as a student. Browse tutors to get started.</p>
                        <a href="search.html" class="mt-2 px-6 py-2.5 bg-primary text-white text-sm font-black rounded-xl hover:brightness-110 transition-all">
                            Browse Tutors
                        </a>
                    </div>
                </td>
            </tr>`;
    }

    // ── Animate number ──
    function animateValue(obj, start, end, duration, suffix = '') {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString() + suffix;
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }
});

// ── Mark inquiry as replied ──
async function markReplied(inquiryId) {
    const { error } = await window.supabaseClient
        .from('inquiries')
        .update({ status: 'replied' })
        .eq('id', inquiryId);

    if (!error) {
        showToast('✅ Marked as replied');
        // Refresh the row color
        location.reload();
    }
}

// ── Toast ──
function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 transition-all';
    toast.innerHTML = `<span class="material-symbols-outlined text-emerald-400">notifications_active</span><span class="font-black text-sm">${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 4000);
}

const style = document.createElement('style');
style.innerHTML = `@keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }`;
document.head.appendChild(style);
