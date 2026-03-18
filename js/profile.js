/**
 * GullyTutor Profile Page Logic
 * Loads tutor from Supabase, wires booking to save inquiry to DB
 */

document.addEventListener('DOMContentLoaded', async () => {
    const nameEl = document.getElementById('profile-name');
    if (!nameEl) return;

    const params = new URLSearchParams(window.location.search);
    const tutorId = params.get('id');

    if (!tutorId) { window.location.href = 'search.html'; return; }

    // DOM refs
    const summaryEl       = document.getElementById('profile-subject-summary');
    const taughtEl        = document.getElementById('total-taught');
    const expEl           = document.getElementById('experience-yrs');
    const ratingEl        = document.getElementById('profile-rating');
    const locationEl      = document.getElementById('profile-location');
    const aboutEl         = document.getElementById('profile-about');
    const subjectsEl      = document.getElementById('subjects-container');
    const rateEl          = document.getElementById('hourly-rate');
    const imgEl           = document.getElementById('profile-img');
    const bookingBtn      = document.getElementById('booking-btn');
    const whatsappBtn     = document.getElementById('whatsapp-btn');

    // Get logged-in user (optional — booking still works as guest)
    let currentUser = null;
    let currentProfile = null;
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) {
            currentUser = user;
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            currentProfile = profile;
        }
    } catch (e) {}

    async function init() {
        try {
            const tutor = await window.tutorService.fetchTutorById(tutorId);

            if (!tutor) {
                nameEl.textContent = 'Tutor Not Found';
                return;
            }

            // Populate all fields
            nameEl.textContent = tutor.name;
            summaryEl.textContent = `${tutor.subject} Specialist • ${tutor.is_verified ? 'Verified Expert' : 'Expert Tutor'}`;
            taughtEl.textContent  = `${tutor.view_count || 0}+`;
            expEl.textContent     = `${tutor.experience || 1}+ Yrs`;
            ratingEl.textContent  = parseFloat(tutor.rating || 4.5).toFixed(1);
            locationEl.textContent = `${tutor.neighborhood || 'Delhi NCR'}, ${tutor.city || 'Delhi NCR'}`;
            rateEl.textContent    = `₹${tutor.price}`;
            imgEl.src             = tutor.image_url || `https://i.pravatar.cc/300?u=${tutorId}`;

            // About
            aboutEl.innerHTML = tutor.about
                ? tutor.about.split('\n').map(p => `<p class="mb-4 leading-relaxed">${p}</p>`).join('')
                : `<p class="mb-4 leading-relaxed">Dedicated educator specialising in ${tutor.subject} for CBSE, JEE, and NEET. ${tutor.experience}+ years of experience in ${tutor.neighborhood || 'Delhi NCR'}.</p>`;

            // Subject tags
            const tags = [tutor.subject, 'CBSE', 'Class 12', 'Exams'];
            subjectsEl.innerHTML = tags.map(tag => `
                <div class="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-primary/50 transition-all shadow-sm">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">verified</span>
                        <h4 class="text-lg font-bold text-slate-900">${tag}</h4>
                    </div>
                    <p class="text-xs text-slate-500 font-medium uppercase tracking-widest mt-2">Expert Tutoring</p>
                </div>`).join('');

            setupBooking(tutor);

        } catch (err) {
            console.error('Profile error:', err);
            nameEl.textContent = 'Error Loading Profile';
        }
    }

    function setupBooking(tutor) {
        let selectedSlot = null;
        const slotBtns = document.querySelectorAll('.slot-btn');

        slotBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                slotBtns.forEach(b => {
                    b.classList.remove('border-primary', 'bg-primary/5', 'ring-1', 'ring-primary/20');
                    b.querySelector('.material-symbols-outlined').classList.add('text-transparent');
                    b.querySelector('.material-symbols-outlined').classList.remove('text-primary');
                });
                btn.classList.add('border-primary', 'bg-primary/5', 'ring-1', 'ring-primary/20');
                btn.querySelector('.material-symbols-outlined').classList.remove('text-transparent');
                btn.querySelector('.material-symbols-outlined').classList.add('text-primary');
                selectedSlot = btn.getAttribute('data-slot');
            });
        });

        bookingBtn.addEventListener('click', async () => {
            const originalHTML = bookingBtn.innerHTML;

            if (!selectedSlot) {
                bookingBtn.innerHTML = `<span class="material-symbols-outlined mr-2">event_busy</span> Select a Slot First`;
                setTimeout(() => { bookingBtn.innerHTML = originalHTML; }, 2000);
                return;
            }

            bookingBtn.disabled = true;
            bookingBtn.innerHTML = `<span style="display:inline-block;width:18px;height:18px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;margin-right:8px"></span> Processing...`;

            try {
                // Use logged-in user's details if available
                const studentName  = currentProfile
                    ? `${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim()
                    : 'Guest User';
                const studentEmail = currentUser?.email || '';

                await window.tutorService.submitInquiry({
                    tutorId:      tutor.id,
                    studentName:  studentName || 'Guest User',
                    studentEmail: studentEmail,
                    message:      `Demo class requested for ${selectedSlot}. Subject: ${tutor.subject}.`
                });

                // Confetti 🎉
                if (window.confetti) {
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#2463eb', '#ffffff', '#fbbf24'] });
                }

                bookingBtn.classList.replace('bg-primary', 'bg-emerald-500');
                bookingBtn.innerHTML = `<span class="material-symbols-outlined mr-2">verified</span> Request Sent!`;

                setTimeout(() => {
                    bookingBtn.classList.replace('bg-emerald-500', 'bg-primary');
                    bookingBtn.innerHTML = originalHTML;
                    bookingBtn.disabled = false;
                }, 4000);

            } catch (err) {
                console.error('Booking error:', err);
                bookingBtn.innerHTML = `<span class="material-symbols-outlined mr-2">error</span> Try Again`;
                bookingBtn.disabled = false;
                setTimeout(() => { bookingBtn.innerHTML = originalHTML; }, 2500);
            }
        });

        // WhatsApp
        whatsappBtn.addEventListener('click', () => {
            const phone = tutor.phone || '919999999999';
            const msg = `Hello ${tutor.name}, I found your profile on GullyTutor and I'm interested in ${tutor.subject} tuition (₹${tutor.price}/hr). Can we discuss a demo class?`;
            window.open(`https://wa.me/${phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
        });
    }

    // Spin animation for loading button
    const s = document.createElement('style');
    s.textContent = `@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)} }`;
    document.head.appendChild(s);

    init();
});
