/**
 * GullyTutor Search Page Logic - Dynamic filtering and card rendering
 * Optimized for Indian context: ₹ Prices, India locations, CBSE/JEE/NEET
 */

const resultsContainer = document.getElementById('tutor-results-container');
const resultsCountEl = document.getElementById('results-count');
const resultsMetaEl = document.getElementById('results-meta');

// Filters
const subjectFilter = document.getElementById('subject-filter');
const minPriceFilter = document.getElementById('min-price');
const maxPriceFilter = document.getElementById('max-price');
const distanceFilter = document.getElementById('distance-filter');
const distanceValueEl = document.getElementById('distance-value');
const sortSelect = document.getElementById('sort-select');

// Map & AI
const toggleMapBtn = document.getElementById('toggle-map-btn');
const mapViewContainer = document.getElementById('map-view-container');
const aiMatchContainer = document.getElementById('ai-match-container');
const aiMatchResults = document.getElementById('ai-match-results');

// Page Guard: Only run search logic on the search page
if (resultsContainer) {
    document.addEventListener('DOMContentLoaded', async () => {
        // Ensure Demo Data exists
        await window.tutorService.ensureDemoData();

        // Parse current URL for pre-filled filters
        const params = new URLSearchParams(window.location.search);
        const urlSubject = params.get('subject');
        const nearMeMode = params.get('nearMe') === 'true';

        if (urlSubject) {
            subjectFilter.value = urlSubject;
        }

        if (nearMeMode) {
            document.body.prepend(createLocationLoader());
            window.userCoords = await getUserLocation();
            document.getElementById('location-loader')?.remove();

            if (mapViewContainer.classList.contains('hidden')) toggleMapView();
            fetchAndRenderTutors(true);
        } else {
            fetchAndRenderTutors();
        }

        // Event Listeners for Live Filtering
        [minPriceFilter, maxPriceFilter, sortSelect].forEach(el => {
            el.addEventListener('change', debounce(() => fetchAndRenderTutors(), 400));
        });

        subjectFilter.addEventListener('input', debounce(() => fetchAndRenderTutors(), 400));

        distanceFilter.addEventListener('input', (e) => {
            const val = e.target.value;
            distanceValueEl.textContent = `${val}km`;
            debounce(() => fetchAndRenderTutors(), 300)();
        });

        // Toggle Map
        if (toggleMapBtn) {
            toggleMapBtn.addEventListener('click', toggleMapView);
        }

        // Find Tutors Near Me
        const nearMeBtn = document.getElementById('near-me-btn');
        if (nearMeBtn) {
            nearMeBtn.addEventListener('click', async () => {
                document.body.prepend(createLocationLoader());
                window.userCoords = await getUserLocation();
                document.getElementById('location-loader')?.remove();

                // Switch to map view if hidden
                if (mapViewContainer.classList.contains('hidden')) toggleMapView();

                // Re-center map
                if (map && window.userCoords) {
                    map.setView([window.userCoords.lat, window.userCoords.lng], 13);
                }

                fetchAndRenderTutors(true);
            });
        }
    });
}

/**
 * Get Browser Geolocation with Fallback to Delhi NCR Center
 */
async function getUserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ lat: 28.6139, lng: 77.2090 });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => {
                resolve({ lat: 28.6139, lng: 77.2090 });
            },
            { timeout: 5000 }
        );
    });
}

function createLocationLoader() {
    const loader = document.createElement('div');
    loader.id = 'location-loader';
    loader.className = 'fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center animate-[fadeIn_0.3s]';
    loader.innerHTML = `
        <div class="bg-white dark:bg-slate-900 p-8 rounded-[32px] text-center shadow-2xl border border-primary/20 max-w-sm mx-4">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span class="material-symbols-outlined text-primary text-3xl animate-bounce">location_on</span>
            </div>
            <h3 class="text-xl font-black text-slate-900 dark:text-white mb-2">Detecting Gully...</h3>
            <p class="text-sm text-slate-500">GullyTutor is identifying your neighborhood to find the closest experts.</p>
        </div>
    `;
    return loader;
}

/**
 * AI Match Logic: Auto-calculate when subject changes
 */
async function triggerAIMatch(subject, budget) {
    if (!aiMatchContainer) {
        return;
    }

    const matches = await window.tutorService.getAIRecommendations(subject, budget);
    if (matches && matches.length > 0) {
        aiMatchContainer.classList.remove('hidden');
        aiMatchResults.innerHTML = matches.map((tutor, i) => {
            const ratingStars = Array(5).fill(0).map((_, i) => `
                <span class="material-symbols-outlined text-[8px] ${i < Math.floor(tutor.rating) ? 'text-amber-400' : 'text-slate-200'}">star</span>
            `).join('');

            const trustScore = Math.min(98, 65 + (tutor.rating * 4) + (tutor.experience * 1) + Math.floor((tutor.view_count || 100) / 100));

            return `
                <div class="col-span-1 p-6 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl transition-all hover:scale-[1.03] animate-[fadeIn_0.5s_ease-out_forwards] relative overflow-hidden" style="animation-delay: ${i * 150}ms">
                    <div class="flex flex-col items-center text-center">
                        <div class="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 mb-4">
                            <img src="${tutor.image_url || `https://i.pravatar.cc/100?u=${tutor.id}`}" class="w-full h-full object-cover">
                        </div>
                        <h4 class="text-sm font-black text-slate-800 dark:text-white leading-tight mb-2">${tutor.name}</h4>

                        <div class="flex flex-col items-center gap-1 mb-4">
                            <div class="flex items-center gap-2">
                                <div class="flex">${ratingStars}</div>
                                <span class="text-[9px] font-black text-slate-400 uppercase">${tutor.experience} Yrs</span>
                            </div>
                            <div class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Trust Score: ${trustScore}%</div>
                        </div>

                        <div class="mb-6">
                            <span class="text-lg font-black text-primary">₹${tutor.price}</span>
                            <span class="text-[10px] font-bold text-slate-400">/hr</span>
                        </div>
                        <a href="tutor-profile?id=${tutor.id}" class="w-full py-3 flex items-center justify-center rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/30 hover:brightness-110 transition-all">Select Master</a>
                    </div>
                </div>
            `;
        }).join('');
        return matches;
    } else {
        aiMatchContainer.classList.add('hidden');
        return [];
    }
}

/**
 * Map View Logic
 */
function toggleMapView() {
    if (!mapViewContainer) return;
    mapViewContainer.classList.toggle('hidden');

    if (!map && !mapViewContainer.classList.contains('hidden')) {
        // Init Map of Delhi NCR
        map = L.map('tutor-map', { scrollWheelZoom: false }).setView([28.6139, 77.2090], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap researchers'
        }).addTo(map);

        updateMapMarkers();
    } else if (!mapViewContainer.classList.contains('hidden')) {
        setTimeout(() => {
            map.invalidateSize();
            updateMapMarkers();
        }, 100);
    }
}

function updateMapMarkers() {
    if (!map) return;

    // Clear old markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const rawTutors = window.currentTutors || [];

    // Center map on user if available
    if (window.userCoords) {
        map.setView([window.userCoords.lat, window.userCoords.lng], 13);

        // Add User marker
        const userMarker = L.circleMarker([window.userCoords.lat, window.userCoords.lng], {
            radius: 10,
            fillColor: "#2563eb",
            color: "#fff",
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map).bindPopup("<div class='font-black text-xs text-primary'>You are here</div>");
        markers.push(userMarker);

        // Optional: show 3km radius circle
        L.circle([window.userCoords.lat, window.userCoords.lng], {
            radius: 3000,
            color: '#2563eb',
            fillColor: '#2563eb',
            fillOpacity: 0.05,
            weight: 1
        }).addTo(map);
    }

    rawTutors.forEach(tutor => {
        // Use real coords or randomized fallback
        const lat = tutor.lat || (28.6139 + (Math.random() * 0.1 - 0.05));
        const lng = tutor.lng || (77.2090 + (Math.random() * 0.1 - 0.05));

        const isNearby = tutor.simulated_distance <= 3;

        const marker = L.marker([lat, lng], {
            opacity: isNearby ? 1 : 0.6
        }).addTo(map);

        marker.bindPopup(`
            <div class="p-2 min-w-[150px]">
                <div class="font-black text-slate-900 text-sm mb-1">${tutor.name}</div>
                <div class="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">${tutor.subject}</div>
                <div class="text-[10px] font-bold text-slate-500 mb-3">₹${tutor.price}/hr • ${tutor.simulated_distance}km away</div>
                <a href="tutor-profile?id=${tutor.id}" class="block w-full py-2 text-center bg-primary text-white text-[10px] font-black rounded-lg uppercase no-underline hover:brightness-110 transition-all shadow-md shadow-primary/20">View Profile</a>
            </div>
        `);
        markers.push(marker);
    });
}

/**
 * Core function to fetch data and update UI
 */
async function fetchAndRenderTutors(nearMe = false) {
    showSkeletons();

    const filters = {
        subject: subjectFilter.value,
        minPrice: parseInt(minPriceFilter.value) || 0,
        maxPrice: parseInt(maxPriceFilter.value) || 10000,
        distance: parseInt(distanceFilter.value),
        sortBy: sortSelect.value,
        nearMe: nearMe,
        userLat: window.userCoords?.lat,
        userLng: window.userCoords?.lng
    };

    const tutors = await window.tutorService.fetchTutors(filters);
    window.currentTutors = tutors;

    // Background tasks
    const aiMatches = await triggerAIMatch(filters.subject, filters.maxPrice);
    const aiMatchIds = (aiMatches || []).map(t => t.id);

    if (mapViewContainer && !mapViewContainer.classList.contains('hidden')) updateMapMarkers();

    // Update Results Header
    resultsCountEl.textContent = tutors.length;

    if (nearMe) {
        resultsMetaEl.textContent = `Tutors found within 3km of your current location`;
        resultsMetaEl.classList.add('text-primary');
    } else {
        resultsMetaEl.textContent = filters.subject ? `Tutors found for "${filters.subject}" in Delhi NCR` : `Expert tutors available in your local radius`;
        resultsMetaEl.classList.remove('text-primary');
    }

    // Render Cards
    if (tutors.length === 0) {
        resultsContainer.innerHTML = `
            <div class="col-span-full py-20 text-center animate-[fadeIn_0.5s]">
                <span class="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-4 scale-110">search_off</span>
                <h3 class="text-2xl font-black text-slate-800 dark:text-slate-200">No Tutors Found</h3>
                <p class="text-slate-500 mt-2">Try adjusting your filters or price range for your nearby area.</p>
                <button onclick="window.location.reload()" class="mt-6 text-primary font-bold hover:underline">Reset All Filters</button>
            </div>
        `;
    } else {
        // Sort by distance if nearMe is active
        const sortedTutors = nearMe ? [...tutors].sort((a, b) => (a.simulated_distance || 99) - (b.simulated_distance || 99)) : tutors;
        resultsContainer.innerHTML = sortedTutors.map(tutor => createTutorCard(tutor, aiMatchIds)).join('');
    }
}

/**
 * Factory for creating premium tutor cards
 */
function createTutorCard(tutor, aiMatchIds = []) {
    const isVerified = tutor.rating >= 4.7;
    const isElite = tutor.experience >= 8;
    const isNearby = tutor.simulated_distance <= 3;
    const isAIRecommended = aiMatchIds.map(String).includes(String(tutor.id));

    // Limit to 2 badges for clarity
    let visibleBadges = [];
    if (isAIRecommended) visibleBadges.push('AI Recommended');
    if (isNearby && visibleBadges.length < 2) visibleBadges.push('Nearby');
    if (isElite && visibleBadges.length < 2) visibleBadges.push('Elite Pro');
    if (isVerified && visibleBadges.length < 2 && !isElite) visibleBadges.push('Verified Expert');

    const ratingStars = Array(5).fill(0).map((_, i) => `
        <span class="material-symbols-outlined text-[10px] ${i < Math.floor(tutor.rating) ? 'text-amber-400' : 'text-slate-200'}">star</span>
    `).join('');

    const trustScore = Math.min(98, 65 + (tutor.rating * 4) + (tutor.experience * 1) + Math.floor((tutor.view_count || 100) / 100));

    return `
        <div class="group relative bg-white dark:bg-slate-900 rounded-[32px] border ${isAIRecommended ? 'border-primary ring-2 ring-primary/10' : 'border-slate-100 dark:border-slate-800'} p-6 transition-all duration-500 hover:shadow-[0_20px_50px_-15px_rgba(36,99,235,0.15)] hover:-translate-y-2 animate-[fadeIn_0.5s_ease-out_forwards]">
            
            <!-- Top Right Badges (No Text Overlap) -->
            <div class="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                ${visibleBadges.map(badge => `
                    <div class="${badge === 'AI Recommended' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm border border-black/5">
                        ${badge}
                    </div>
                `).join('')}
            </div>

            <div class="flex items-start gap-6">
                <!-- Profile Image -->
                <div class="relative flex-shrink-0">
                    <div class="w-20 h-20 rounded-[24px] overflow-hidden ring-4 ${isAIRecommended ? 'ring-primary/10' : 'ring-slate-50 dark:ring-slate-800'} transition-all group-hover:ring-primary/10">
                        <img src="${tutor.image_url || `https://i.pravatar.cc/200?u=${tutor.id}`}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                    </div>
                </div>

                <!-- Info -->
                <div class="flex-1 pr-16"> <!-- Padding right to avoid badge overlap -->
                    <h3 class="text-lg font-black text-slate-900 dark:text-white leading-tight mb-1">${tutor.name}</h3>
                    <p class="text-[10px] font-black text-primary uppercase tracking-widest mb-2">${tutor.subject}</p>
                    
                    <div class="space-y-1 mb-4">
                        <div class="flex items-center gap-3">
                            <div class="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                <span class="text-[10px] font-black">${tutor.rating}</span>
                                <div class="flex">${ratingStars}</div>
                            </div>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">${tutor.experience} Years Exp.</span>
                        </div>
                        <div class="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                            Trust Score: ${trustScore}%
                        </div>
                    </div>

                    <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                        ${tutor.about || `Passionate ${tutor.subject} enthusiast helping students across Delhi NCR.`}
                    </p>
                </div>
            </div>

            <!-- Bottom Row -->
            <div class="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Hourly Rate</div>
                    <div class="flex items-baseline gap-1">
                        <span class="text-xl font-black text-slate-900 dark:text-white">₹${tutor.price}</span>
                        <span class="text-xs font-bold text-slate-400">/hr</span>
                    </div>
                </div>
                
                <a href="tutor-profile?id=${tutor.id}" class="h-10 px-6 flex items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-lg shadow-black/5">
                    View Profile
                </a>
            </div>
        </div>
    `;
}

/**
 * Show Skelton Loaders for better UX
 */
function showSkeletons() {
    resultsContainer.innerHTML = Array(6).fill(0).map(() => `
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm overflow-hidden">
            <div class="flex items-center gap-4 mb-6">
                <div class="skeleton w-16 h-16 rounded-xl"></div>
                <div class="space-y-2">
                    <div class="skeleton w-32 h-4 rounded"></div>
                    <div class="skeleton w-24 h-3 rounded"></div>
                </div>
            </div>
            <div class="skeleton w-full h-3 rounded mb-2"></div>
            <div class="skeleton w-2/3 h-3 rounded mb-6"></div>
            <div class="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <div class="skeleton w-16 h-8 rounded"></div>
                <div class="skeleton w-24 h-8 rounded"></div>
            </div>
        </div>
    `).join('');
}

/**
 * Debounce helper for performance
 */
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Global fade-in animation
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);
/**
 * Ask AI - Simple Natural Language Query Parsing
 */
async function aiAsk(presetQuery) {
    const inputEl = document.getElementById('ai-input');
    const messageContainer = document.getElementById('ai-messages');
    const query = presetQuery || inputEl.value;
    if (!query) return;

    if (inputEl) inputEl.value = '';

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'bg-primary text-white p-4 rounded-2xl rounded-tr-none border border-primary/20 ml-auto max-w-[80%]';
    userMsg.innerHTML = `<p class="text-sm font-bold">${query}</p>`;
    messageContainer.appendChild(userMsg);
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Simulate AI thinking and filtering
    setTimeout(async () => {
        let feedback = "Searching my database for the best match...";
        const lowerQuery = query.toLowerCase();

        // Simple Keyword Detection
        if (lowerQuery.includes('physics')) {
            subjectFilter.value = 'Physics';
            feedback = "I've found our top physics experts for you.";
        } else if (lowerQuery.includes('math') || lowerQuery.includes('algebra')) {
            subjectFilter.value = 'Mathematics';
            feedback = "Showing our specialized math tutors.";
        } else if (lowerQuery.includes('bio')) {
            subjectFilter.value = 'Biology';
            feedback = "Listed the best biology tutors in your gully.";
        }

        if (lowerQuery.includes('under') || lowerQuery.includes('cheapest') || lowerQuery.includes('price')) {
            const priceMatch = lowerQuery.match(/\d+/);
            if (priceMatch) {
                maxPriceFilter.value = priceMatch[0];
                feedback += ` Filtered for tutors under ₹${priceMatch[0]}.`;
            } else {
                maxPriceFilter.value = '800';
                feedback += " Filtered for budget-friendly options under ₹800.";
            }
        }

        if (lowerQuery.includes('near') || lowerQuery.includes('closest') || lowerQuery.includes('walking')) {
            distanceFilter.value = '3';
            distanceValueEl.textContent = '3km';
            feedback += " Optimized for walking distance (3km).";
        }

        // Trigger search
        fetchAndRenderTutors();

        // Add AI response
        const aiMsg = document.createElement('div');
        aiMsg.className = 'bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800';
        aiMsg.innerHTML = `<p class="text-sm text-slate-600 dark:text-slate-400 font-bold">${feedback}</p>`;
        messageContainer.appendChild(aiMsg);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 600);
}

// Add enter key listener for AI input
document.addEventListener('DOMContentLoaded', () => {
    const aiInput = document.getElementById('ai-input');
    if (aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') aiAsk();
        });
    }
});
