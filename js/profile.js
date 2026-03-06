/**
 * GullyTutor Profile Page Logic - Dynamic data loading and WhatsApp integration
 * Optimized for Indian localization: ₹ Prices, India locations, CBSE/JEE/NEET tags
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Page Guard: Only run on Profile Page
    const nameEl = document.getElementById('profile-name');
    if (!nameEl) return;

    // Get tutor ID from URL
    const params = new URLSearchParams(window.location.search);
    const tutorId = params.get('id');

    if (!tutorId) {
        // Silently handle missing ID for init fallback
    }

    // DOM Elements
    const summaryEl = document.getElementById('profile-subject-summary');
    const taughtEl = document.getElementById('total-taught');
    const expEl = document.getElementById('experience-yrs');
    const ratingEl = document.getElementById('profile-rating');
    const locationEl = document.getElementById('profile-location');
    const aboutEl = document.getElementById('profile-about');
    const subjectsContainer = document.getElementById('subjects-container');
    const rateEl = document.getElementById('hourly-rate');
    const imgEl = document.getElementById('profile-img');
    const bookingBtn = document.getElementById('booking-btn');
    const whatsappBtn = document.getElementById('whatsapp-btn');

    /**
     * Load and render tutor data
     */
    async function init() {
        if (!tutorId) {
            console.error('Redirecting: No tutor ID found in URL. Current params:', params.toString());
            window.location.href = 'search.html';
            return;
        }

        try {
            // Show loading state if needed (currently handled by "Loading Profile..." in HTML)
            const tutor = await window.tutorService.fetchTutorById(tutorId);

            if (!tutor) {
                nameEl.textContent = "Tutor Not Found";
                console.error('Tutor not found');
                return;
            }

            // Verify essential data exists
            const safeData = {
                name: tutor.name || "Verified Expert",
                subject: tutor.subject || "Academic",
                experience: tutor.experience || 5,
                price: tutor.price || 500,
                rating: tutor.rating || 4.5,
                location: tutor.location || "Delhi NCR",
                qualification: tutor.qualification || "Verified Expert"
            };

            // Update UI elements only after data is ready
            nameEl.textContent = safeData.name;
            summaryEl.textContent = `${safeData.subject} Specialist • ${safeData.qualification}`;
            taughtEl.textContent = `${tutor.students_taught || Math.floor(Math.random() * 400 + 100)}+`;
            expEl.textContent = `${safeData.experience}+ Yrs`;
            ratingEl.textContent = safeData.rating.toFixed(1);
            locationEl.textContent = `${safeData.location}, Delhi NCR`;
            rateEl.textContent = `₹${safeData.price}`;

            if (tutor.image_url) {
                imgEl.src = tutor.image_url;
            } else {
                imgEl.src = `https://i.pravatar.cc/300?u=${tutorId}`;
            }

            // Update About
            if (tutor.about) {
                const paragraphs = tutor.about.split('\n');
                aboutEl.innerHTML = paragraphs.map(p => `<p class="mb-4 leading-relaxed">${p}</p>`).join('');
            } else {
                aboutEl.innerHTML = `
                    <p class="mb-4 leading-relaxed">Dedicated educator specializing in ${safeData.subject} for CBSE, JEE, and NEET preparation. With over ${safeData.experience} years of experience, focus is on simplifying complex theories and building a strong conceptual foundation in the ${safeData.location} region.</p>
                    <p class="leading-relaxed">Available for home tuition, online sessions, and group classes in ${safeData.location}. Proven track record of improving student grades and confidence.</p>
                `;
            }

            // Render Exam Preparation Tags & Specializations
            let specializations = [];
            try {
                specializations = tutor.specializations ? JSON.parse(tutor.specializations) : [safeData.subject, "CBSE", "Class 12", "Exams"];
            } catch (e) {
                specializations = [safeData.subject, "CBSE"];
            }

            subjectsContainer.innerHTML = specializations.map(tag => `
                <div class="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all shadow-sm">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">verified</span>
                        <h4 class="text-lg font-bold text-slate-900 dark:text-white">${tag}</h4>
                    </div>
                    <p class="text-xs text-slate-500 font-medium uppercase tracking-widest mt-2">Expert Tutoring</p>
                </div>
            `).join('');

            // Analytics: Increment view count
            window.tutorService.incrementTutorView(tutorId);

            // Setup Interactions
            setupEventListeners(tutor);

        } catch (error) {
            console.error('GullyTutor Profile Error:', error);
            nameEl.textContent = "Error Loading Profile";
        }
    }

    /**
     * Setup Event Listeners for buttons
     */
    function setupEventListeners(tutor) {
        let selectedSlot = null;
        const slotBtns = document.querySelectorAll('.slot-btn');

        slotBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Reset all
                slotBtns.forEach(b => {
                    b.classList.remove('border-primary', 'bg-primary/5', 'ring-1', 'ring-primary/20');
                    b.querySelector('.material-symbols-outlined').classList.add('text-transparent');
                    b.querySelector('.material-symbols-outlined').classList.remove('text-primary', 'filled-icon');
                });

                // Select this one
                btn.classList.add('border-primary', 'bg-primary/5', 'ring-1', 'ring-primary/20');
                btn.querySelector('.material-symbols-outlined').classList.remove('text-transparent');
                btn.querySelector('.material-symbols-outlined').classList.add('text-primary', 'filled-icon');
                selectedSlot = btn.getAttribute('data-slot');
            });
        });

        // Booking Button
        bookingBtn.addEventListener('click', async () => {
            const originalText = bookingBtn.innerHTML;

            if (!selectedSlot) {
                bookingBtn.innerHTML = `<span class="material-symbols-outlined mr-2">event_busy</span> Select a Slot`;
                setTimeout(() => { bookingBtn.innerHTML = originalText; }, 2000);
                return;
            }

            bookingBtn.disabled = true;
            bookingBtn.innerHTML = `<span class="animate-spin inline-block mr-2 opacity-60">◌</span> Processing...`;

            try {
                await window.tutorService.submitInquiry({
                    tutor_id: tutor.id,
                    student_name: 'Guest User',
                    message: `Demo Class requested for ${selectedSlot}. Subject: ${tutor.subject}.`,
                    status: 'new'
                });

                // PARTY TIME!
                if (window.confetti) {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#2463eb', '#ffffff', '#fbbf24']
                    });
                }

                // Success microinteraction
                bookingBtn.classList.remove('bg-primary');
                bookingBtn.classList.add('bg-emerald-500');
                bookingBtn.innerHTML = `<span class="material-symbols-outlined mr-2">verified</span> Request Sent!`;

                setTimeout(() => {
                    bookingBtn.classList.add('bg-primary');
                    bookingBtn.classList.remove('bg-emerald-500');
                    bookingBtn.innerHTML = originalText;
                    bookingBtn.disabled = false;
                }, 4000);

            } catch (err) {
                bookingBtn.innerHTML = `<span class="material-symbols-outlined mr-2">error</span> Try Again`;
                bookingBtn.disabled = false;
                setTimeout(() => { bookingBtn.innerHTML = originalText; }, 2000);
            }
        });

        // WhatsApp Button - Indian Format with detailed lead data
        whatsappBtn.addEventListener('click', () => {
            const phone = tutor.phone || '919999999999';
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const msg = `Hello ${tutor.name}, I found your profile on GullyTutor and I’m interested in your ${tutor.subject} tuition (₹${tutor.price}/hr) in ${tutor.location}. Let's discuss a demo class!`;
            const text = encodeURIComponent(msg);
            window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
        });
    }

    // Initialize
    init();
});
