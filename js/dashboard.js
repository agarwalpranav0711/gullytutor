/**
 * GullyTutor Dashboard Logic - Handles stats and inquiries management
 * Optimized for Indian localization: ₹ Prices, India context
 */

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('inquiries-table');
    if (!tableBody) return;

    const params = new URLSearchParams(window.location.search);
    const currentTutorId = parseInt(params.get('tutor_id')) || 1;

    const viewsEl = document.getElementById('total-views');
    const inquiriesCountEl = document.getElementById('new-inquiries');
    const conversionRateEl = document.getElementById('conversion-rate');
    const ratingEl = document.getElementById('avg-rating');
    const nameSidebar = document.getElementById('tutor-name-sidebar');
    const imgSidebar = document.getElementById('tutor-img-sidebar');

    // ── Init Supabase with new credentials ──
    window.supabaseClient = supabase.createClient(
        'https://fhjjwqmptrytnjcpulxu.supabase.co',
        'sb_publishable_Wv2sbgbxWoNePCbOfBMyfQ_E_HS2zis'
    );

    // ── Show logged-in user's name from Supabase session ──
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) {
            const firstName = user.user_metadata?.first_name || '';
            const lastName  = user.user_metadata?.last_name  || '';
            const fullName  = (firstName + ' ' + lastName).trim() || user.email.split('@')[0];
            if (nameSidebar) nameSidebar.textContent = fullName;
            if (imgSidebar) {
                imgSidebar.src = `https://i.pravatar.cc/100?u=${encodeURIComponent(user.email)}`;
            }
        } else {
            if (nameSidebar) nameSidebar.textContent = 'Not logged in';
        }
    } catch (e) {
        console.warn('Could not load user session:', e);
    }

    /**
     * Load all dashboard data
     */
    async function loadDashboardData() {
        try {
            const tutor = await window.tutorService.fetchTutorById(currentTutorId);
            let viewCount = 0;
            if (tutor) {
                const currentName = nameSidebar?.textContent;
                if (!currentName || currentName === 'Loading...') {
                    if (nameSidebar) nameSidebar.textContent = tutor.name;
                }
                if (tutor.image_url && imgSidebar) imgSidebar.src = tutor.image_url;
                viewCount = tutor.view_count || 0;
                animateValue(viewsEl, 0, viewCount, 1000);
                if (ratingEl) ratingEl.textContent = tutor.rating || '0.0';
            }

            const { data: inquiries, error } = await window.supabaseClient
                .from('inquiries')
                .select('*')
                .eq('tutor_id', currentTutorId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const inquiryCount = inquiries.length;
            animateValue(inquiriesCountEl, 0, inquiryCount, 1000);

            const conversionRate = viewCount > 0 ? Math.round((inquiryCount / viewCount) * 100) : 0;
            if (conversionRateEl) animateValue(conversionRateEl, 0, conversionRate, 1000, '%');

            renderInquiries(inquiries);

        } catch (error) {
            console.error('GullyTutor Dashboard Error:', error);
            tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-red-500 font-bold bg-red-50 dark:bg-red-900/10 rounded-xl">Connection error. Check console for details.</td></tr>`;
        }
    }

    /**
     * Render the inquiries table
     */
    function renderInquiries(inquiries) {
        if (!inquiries || inquiries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                        <div class="flex flex-col items-center">
                            <span class="material-symbols-outlined text-4xl mb-2 opacity-20">inbox</span>
                            <p class="font-medium text-sm text-slate-500">No student inquiries yet</p>
                            <p class="text-[10px] uppercase tracking-widest mt-1 opacity-60">Tutoring requests appear here</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = inquiries.map(inquiry => {
            const dateStr = inquiry.created_at ? new Date(inquiry.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            }) : 'Just now';

            const name = inquiry.student_name || 'Anonymous Student';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const status = inquiry.status || 'new';
            const statusClass = status === 'new' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20';
            const statusDot = status === 'new' ? 'bg-blue-500' : 'bg-emerald-500';

            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                    <td class="px-6 py-5">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700">${initials}</div>
                            <div>
                                <p class="text-sm font-bold text-slate-900 dark:text-white">${name}</p>
                                <p class="text-[10px] text-slate-400 font-medium tracking-tight">Standard Inquiry</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-5">
                        <div class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">${inquiry.message || 'Interested in tuition classes.'}</div>
                        <div class="text-[10px] text-slate-400 uppercase tracking-tighter">New Lead</div>
                    </td>
                    <td class="px-6 py-5 text-center">
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">Nearby</span>
                    </td>
                    <td class="px-6 py-5 text-xs text-slate-500 dark:text-slate-400">${dateStr}</td>
                    <td class="px-6 py-5">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${statusClass} border border-slate-100 dark:border-slate-800">
                            <span class="w-1.5 h-1.5 rounded-full ${statusDot} mr-1.5"></span> ${status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-5 text-right">
                        <button class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-all">
                            <span class="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function animateValue(obj, start, end, duration, suffix = '') {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const val = Math.floor(progress * (end - start) + start);
            obj.innerHTML = val.toLocaleString() + suffix;
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    loadDashboardData();

    const inquirySubscription = window.supabaseClient
        .channel('public:inquiries')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inquiries' }, () => {
            showToast("New Student Lead Received!");
            loadDashboardData();
        })
        .subscribe();

    window.addEventListener('beforeunload', () => {
        window.supabaseClient.removeChannel(inquirySubscription);
    });
});

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-10 right-10 bg-slate-900 border border-slate-800 text-white px-8 py-4 rounded-2xl shadow-2xl z-[9999] animate-[fadeIn_0.5s] flex items-center gap-3';
    toast.innerHTML = `
        <span class="material-symbols-outlined text-emerald-400">notifications_active</span>
        <span class="font-black text-[10px] uppercase tracking-widest text-white/90">${msg}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);
