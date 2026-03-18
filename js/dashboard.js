/**
 * GullyTutor Dashboard Logic
 * - Tutors see incoming student inquiries + stats
 * - Students see their own sent requests
 */

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('inquiries-table');
    if (!tableBody) return;

    const viewsEl          = document.getElementById('total-views');
    const inquiriesCountEl = document.getElementById('new-inquiries');
    const conversionRateEl = document.getElementById('conversion-rate');
    const ratingEl         = document.getElementById('avg-rating');
    const nameSidebar      = document.getElementById('tutor-name-sidebar');
    const imgSidebar       = document.getElementById('tutor-img-sidebar');

    // ── 1. Get logged-in user ──
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'index.html?openAuth=login&return=' + encodeURIComponent(window.location.href);
        return;
    }

    // ── 2. Get profile ──
    const { data: profile } = await window.supabaseClient
        .from('profiles').select('*').eq('id', user.id).single();

    const firstName = profile?.first_name || user.user_metadata?.first_name || '';
    const lastName  = profile?.last_name  || user.user_metadata?.last_name  || '';
    const fullName  = (firstName + ' ' + lastName).trim() || user.email.split('@')[0];
    const role      = profile?.role || user.user_metadata?.role || 'student';

    if (nameSidebar) nameSidebar.textContent = fullName;
    if (imgSidebar)  imgSidebar.src = profile?.avatar_url || `https://i.pravatar.cc/100?u=${encodeURIComponent(user.email)}`;

    // ── 3. Branch by role ──
    if (role === 'tutor') {
        await loadTutorDashboard();
    } else {
        await loadStudentDashboard();
    }

    // ════════════════════════════════════════
    // TUTOR DASHBOARD
    // ════════════════════════════════════════
    async function loadTutorDashboard() {
        const { data: tutorRow } = await window.supabaseClient
            .from('tutors').select('*').eq('user_id', user.id).single();

        if (!tutorRow) {
            if (viewsEl) viewsEl.textContent = '0';
            if (ratingEl) ratingEl.textContent = '0.0';
            tableBody.innerHTML = `
                <tr><td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined text-4xl text-primary opacity-40">add_circle</span>
                        <p class="font-bold text-slate-800">You haven't created your tutor listing yet</p>
                        <a href="tutor-register.html" class="mt-2 px-6 py-2.5 bg-primary text-white text-sm font-black rounded-xl hover:brightness-110 transition-all">Create Your Profile</a>
                    </div>
                </td></tr>`;
            return;
        }

        const viewCount = tutorRow.view_count || 0;
        animateValue(viewsEl, 0, viewCount, 1000);
        if (ratingEl) ratingEl.textContent = tutorRow.rating || '0.0';
        if (imgSidebar && tutorRow.image_url) imgSidebar.src = tutorRow.image_url;

        const { data: inquiries, error } = await window.supabaseClient
            .from('inquiries').select('*')
            .eq('tutor_id', tutorRow.id)
            .order('created_at', { ascending: false });

        if (error) { showDbError(error.message); return; }

        const count = inquiries?.length || 0;
        animateValue(inquiriesCountEl, 0, count, 1000);
        const rate = viewCount > 0 ? Math.round((count / viewCount) * 100) : 0;
        animateValue(conversionRateEl, 0, rate, 1000, '%');
        renderInquiriesAsTutor(inquiries || []);

        // Realtime
        window.supabaseClient.channel('tutor-inquiries')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inquiries', filter: `tutor_id=eq.${tutorRow.id}` }, () => {
                showToast('🔔 New Student Lead!');
                loadTutorDashboard();
            }).subscribe();
    }

    // ════════════════════════════════════════
    // STUDENT DASHBOARD
    // ════════════════════════════════════════
    async function loadStudentDashboard() {
        // Hide tutor-only stat cards
        document.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-4 > div').forEach((card, i) => {
            if (i !== 1) card.style.display = 'none';
        });

        // Relabel the enquiries card
        const cardLabel = inquiriesCountEl?.closest('.p-8')?.querySelector('p.text-\\[10px\\]');
        if (cardLabel) cardLabel.textContent = 'My Requests Sent';

        // Update table headers for student view
        const thead = tableBody.closest('table')?.querySelector('thead tr');
        if (thead) thead.innerHTML = `
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tutor</th>
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">My Message</th>
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Subject</th>
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sent On</th>
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>`;

        // Try by student_id first, fallback to email
        let inquiries = [];
        const { data: byId } = await window.supabaseClient
            .from('inquiries')
            .select('*, tutors(id, name, subject, image_url, neighborhood, price)')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false });

        if (byId && byId.length > 0) {
            inquiries = byId;
        } else {
            // Fallback for inquiries submitted before user was logged in
            const { data: byEmail } = await window.supabaseClient
                .from('inquiries')
                .select('*, tutors(id, name, subject, image_url, neighborhood, price)')
                .eq('student_email', user.email)
                .order('created_at', { ascending: false });
            inquiries = byEmail || [];
        }

        animateValue(inquiriesCountEl, 0, inquiries.length, 1000);
        renderInquiriesAsStudent(inquiries);
    }

    // ════════════════════════════════════════
    // RENDER: Tutor sees incoming inquiries
    // ════════════════════════════════════════
    function renderInquiriesAsTutor(inquiries) {
        if (!inquiries.length) {
            tableBody.innerHTML = `
                <tr><td colspan="6" class="px-6 py-12 text-center text-slate-500">
                    <div class="flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-4xl opacity-20">inbox</span>
                        <p class="font-bold text-sm">No student inquiries yet</p>
                        <p class="text-[10px] uppercase tracking-widest opacity-60">Requests from students appear here</p>
                    </div>
                </td></tr>`;
            return;
        }

        tableBody.innerHTML = inquiries.map(inq => {
            const name     = inq.student_name || 'Anonymous Student';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const dateStr  = new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            const status   = inq.status || 'new';
            const sc = status === 'new' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600';
            const sd = status === 'new' ? 'bg-blue-500' : 'bg-emerald-500';
            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-5">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">${initials}</div>
                            <div>
                                <p class="text-sm font-bold text-slate-900">${name}</p>
                                <p class="text-[10px] text-slate-400">${inq.student_email || 'No email'}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-5"><div class="text-sm text-slate-700 truncate max-w-[200px]">${inq.message || 'Interested in tuition.'}</div></td>
                    <td class="px-6 py-5 text-center"><span class="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">Nearby</span></td>
                    <td class="px-6 py-5 text-xs text-slate-500">${dateStr}</td>
                    <td class="px-6 py-5">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${sc}">
                            <span class="w-1.5 h-1.5 rounded-full ${sd} mr-1.5"></span>${status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-5 text-right">
                        <button onclick="markReplied(${inq.id})" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-all" title="Mark replied">
                            <span class="material-symbols-outlined text-[20px]">check_circle</span>
                        </button>
                    </td>
                </tr>`;
        }).join('');
    }

    // ════════════════════════════════════════
    // RENDER: Student sees their sent requests
    // ════════════════════════════════════════
    function renderInquiriesAsStudent(inquiries) {
        if (!inquiries.length) {
            tableBody.innerHTML = `
                <tr><td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined text-4xl text-primary opacity-40">school</span>
                        <p class="font-bold text-slate-800">Welcome, ${fullName}! 👋</p>
                        <p class="text-sm text-slate-500">You haven't sent any tutor requests yet.</p>
                        <a href="search.html" class="mt-2 px-6 py-2.5 bg-primary text-white text-sm font-black rounded-xl hover:brightness-110 transition-all">Browse Tutors</a>
                    </div>
                </td></tr>`;
            return;
        }

        tableBody.innerHTML = inquiries.map(inq => {
            const tutor   = inq.tutors || {};
            const dateStr = new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            const status  = inq.status || 'new';
            const sc = status === 'replied' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600';
            const sd = status === 'replied' ? 'bg-emerald-500' : 'bg-blue-500';
            const statusLabel = status === 'replied' ? 'REPLIED ✓' : 'PENDING';
            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-5">
                        <div class="flex items-center gap-3">
                            <img src="${tutor.image_url || `https://i.pravatar.cc/40?u=${inq.tutor_id}`}" class="w-9 h-9 rounded-full object-cover border border-slate-200">
                            <div>
                                <p class="text-sm font-bold text-slate-900">${tutor.name || 'Tutor'}</p>
                                <p class="text-[10px] text-slate-400">${tutor.neighborhood || 'Delhi NCR'}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-5"><div class="text-sm text-slate-700 truncate max-w-[200px]">${inq.message || 'Demo class request'}</div></td>
                    <td class="px-6 py-5 text-center"><span class="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">${tutor.subject || '—'}</span></td>
                    <td class="px-6 py-5 text-xs text-slate-500">${dateStr}</td>
                    <td class="px-6 py-5">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${sc}">
                            <span class="w-1.5 h-1.5 rounded-full ${sd} mr-1.5"></span>${statusLabel}
                        </span>
                    </td>
                    <td class="px-6 py-5 text-right">
                        <a href="tutor-profile.html?id=${inq.tutor_id}" class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-all inline-flex" title="View tutor">
                            <span class="material-symbols-outlined text-[20px]">open_in_new</span>
                        </a>
                    </td>
                </tr>`;
        }).join('');
    }

    function animateValue(obj, start, end, duration, suffix = '') {
        if (!obj) return;
        let t0 = null;
        const step = (ts) => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / duration, 1);
            obj.innerHTML = Math.floor(p * (end - start) + start).toLocaleString() + suffix;
            if (p < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    function showDbError(msg) {
        tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-red-500 font-bold">Error: ${msg}</td></tr>`;
    }
});

async function markReplied(inquiryId) {
    await window.supabaseClient.from('inquiries').update({ status: 'replied' }).eq('id', inquiryId);
    showToast('✅ Marked as replied');
    setTimeout(() => location.reload(), 1000);
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 transition-all';
    t.innerHTML = `<span class="material-symbols-outlined text-emerald-400">notifications_active</span><span class="font-black text-sm">${msg}</span>`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 4000);
}

const style = document.createElement('style');
style.innerHTML = `@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`;
document.head.appendChild(style);
