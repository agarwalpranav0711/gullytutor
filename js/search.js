/**
 * GullyTutor Search Page Logic - Dynamic filtering and card rendering
 * Loads tutors from Supabase DB
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

let map = null;
let markers = [];

if (resultsContainer) {
    document.addEventListener('DOMContentLoaded', async () => {
        // Parse current URL for pre-filled filters
        const params = new URLSearchParams(window.location.search);
        const urlSubject = params.get('subject');
        const nearMeMode = params.get('nearMe') === 'true';

        if (urlSubject && subjectFilter) subjectFilter.value = urlSubject;

        if (nearMeMode) {
            document.body.prepend(createLocationLoader());
            window.userCoords = await getUserLocation();
            document.getElementById('location-loader')?.remove();
            if (mapViewContainer?.classList.contains('hidden')) toggleMapView();
            fetchAndRenderTutors(true);
        } else {
            fetchAndRenderTutors();
        }

        // Live filter listeners
        [minPriceFilter, maxPriceFilter, sortSelect].forEach(el => {
            el?.addEventListener('change', debounce(() => fetchAndRenderTutors(), 400));
        });

        subjectFilter?.addEventListener('input', debounce(() => fetchAndRenderTutors(), 400));

        distanceFilter?.addEventListener('input', (e) => {
            if (distanceValueEl) distanceValueEl.textContent = `${e.target.value}km`;
            debounce(() => fetchAndRenderTutors(), 300)();
        });

        toggleMapBtn?.addEventListener('click', toggleMapView);

        document.getElementById('near-me-btn')?.addEventListener('click', async () => {
            document.body.prepend(createLocationLoader());
            window.userCoords = await getUserLocation();
            document.getElementById('location-loader')?.remove();
            if (mapViewContainer?.classList.contains('hidden')) toggleMapView();
            if (map && window.userCoords) map.setView([window.userCoords.lat, window.userCoords.lng], 13);
            fetchAndRenderTutors(true);
        });
    });
}

async function getUserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve({ lat: 28.6139, lng: 77.2090 }); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({ lat: 28.6139, lng: 77.2090 }),
            { timeout: 5000 }
        );
    });
}

function createLocationLoader() {
    const loader = document.createElement('div');
    loader.id = 'location-loader';
    loader.className = 'fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center';
    loader.innerHTML = `
        <div class="bg-white p-8 rounded-[32px] text-center shadow-2xl border border-primary/20 max-w-sm mx-4">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span class="material-symbols-outlined text-primary text-3xl animate-bounce">location_on</span>
            </div>
            <h3 class="text-xl font-black text-slate-900 mb-2">Detecting Gully...</h3>
            <p class="text-sm text-slate-500">Finding the closest experts near you.</p>
        </div>`;
    return loader;
}

async function triggerAIMatch(subject, budget) {
    if (!aiMatchContainer) return [];
    const matches = await window.tutorService.getAIRecommendations(subject, budget);
    if (matches && matches.length > 0) {
        aiMatchContainer.classList.remove('hidden');
        aiMatchResults.innerHTML = matches.map((tutor, i) => {
            const stars = Array(5).fill(0).map((_, j) =>
                `<span class="material-symbols-outlined text-[8px] ${j < Math.floor(tutor.rating) ? 'text-amber-400' : 'text-slate-200'}">star</span>`
            ).join('');
            const trustScore = Math.min(98, 65 + (tutor.rating * 4) + (tutor.experience || 1) + Math.floor((tutor.view_count || 100) / 100));
            return `
                <div class="col-span-1 p-6 rounded-[28px] bg-white border border-slate-100 shadow-xl hover:scale-[1.03] transition-all" style="animation-delay:${i*150}ms">
                    <div class="flex flex-col items-center text-center">
                        <div class="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 mb-4">
                            <img src="${tutor.image_url || `https://i.pravatar.cc/100?u=${tutor.id}`}" class="w-full h-full object-cover">
                        </div>
                        <h4 class="text-sm font-black text-slate-800 mb-2">${tutor.name}</h4>
                        <div class="flex items-center gap-1 mb-1">${stars}<span class="text-[9px] font-black text-slate-400 ml-1">${tutor.experience} Yrs</span></div>
                        <div class="text-[8px] font-black text-emerald-500 uppercase mb-4">Trust Score: ${trustScore}%</div>
                        <div class="mb-6"><span class="text-lg font-black text-primary">₹${tutor.price}</span><span class="text-[10px] text-slate-400">/hr</span></div>
                        <a href="tutor-profile.html?id=${tutor.id}" class="w-full py-3 flex items-center justify-center rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all">Select Master</a>
                    </div>
                </div>`;
        }).join('');
        return matches;
    } else {
        aiMatchContainer.classList.add('hidden');
        return [];
    }
}

function toggleMapView() {
    if (!mapViewContainer) return;
    mapViewContainer.classList.toggle('hidden');
    if (!map && !mapViewContainer.classList.contains('hidden')) {
        map = L.map('tutor-map', { scrollWheelZoom: false }).setView([28.6139, 77.2090], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        updateMapMarkers();
    } else if (!mapViewContainer.classList.contains('hidden')) {
        setTimeout(() => { map.invalidateSize(); updateMapMarkers(); }, 100);
    }
}

function updateMapMarkers() {
    if (!map) return;
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    const rawTutors = window.currentTutors || [];

    if (window.userCoords) {
        map.setView([window.userCoords.lat, window.userCoords.lng], 13);
        const um = L.circleMarker([window.userCoords.lat, window.userCoords.lng], {
            radius: 10, fillColor: "#2563eb", color: "#fff", weight: 3, fillOpacity: 0.8
        }).addTo(map).bindPopup("<div class='font-black text-xs text-primary'>You are here</div>");
        markers.push(um);
        L.circle([window.userCoords.lat, window.userCoords.lng], { radius: 3000, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.05, weight: 1 }).addTo(map);
    }

    rawTutors.forEach(tutor => {
        const lat = tutor.lat || (28.6139 + (Math.random() * 0.1 - 0.05));
        const lng = tutor.lng || (77.2090 + (Math.random() * 0.1 - 0.05));
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`
            <div class="p-2 min-w-[150px]">
                <div class="font-black text-sm mb-1">${tutor.name}</div>
                <div class="text-[10px] font-bold text-primary uppercase mb-1">${tutor.subject}</div>
                <div class="text-[10px] text-slate-500 mb-3">₹${tutor.price}/hr</div>
                <a href="tutor-profile.html?id=${tutor.id}" class="block w-full py-2 text-center bg-primary text-white text-[10px] font-black rounded-lg no-underline">View Profile</a>
            </div>`);
        markers.push(marker);
    });
}

async function fetchAndRenderTutors(nearMe = false) {
    showSkeletons();

    // Map sort dropdown values to what tutors.js expects
    const sortMap = { 'rating': 'rating', 'price_low': 'price_asc', 'price_high': 'price_desc', 'experience': 'experience' };

    const filters = {
        subject: subjectFilter?.value || '',
        minPrice: parseInt(minPriceFilter?.value) || 0,
        maxPrice: parseInt(maxPriceFilter?.value) || 10000,
        distance: parseInt(distanceFilter?.value) || 10,
        sortBy: sortMap[sortSelect?.value] || 'rating',
    };

    const tutors = await window.tutorService.fetchTutors(filters);
    window.currentTutors = tutors;

    const aiMatches = await triggerAIMatch(filters.subject, filters.maxPrice);
    const aiMatchIds = (aiMatches || []).map(t => t.id);

    if (mapViewContainer && !mapViewContainer.classList.contains('hidden')) updateMapMarkers();

    if (resultsCountEl) resultsCountEl.textContent = tutors.length;
    if (resultsMetaEl) {
        resultsMetaEl.textContent = nearMe
            ? 'Tutors found within 3km of your current location'
            : filters.subject
                ? `Tutors found for "${filters.subject}" in Delhi NCR`
                : 'Expert tutors available in Delhi NCR';
        resultsMetaEl.classList.toggle('text-primary', nearMe);
    }

    if (tutors.length === 0) {
        resultsContainer.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <span class="material-symbols-outlined text-6xl text-slate-200 mb-4 block">search_off</span>
                <h3 class="text-2xl font-black text-slate-800">No Tutors Found</h3>
                <p class="text-slate-500 mt-2">Try adjusting your filters or price range.</p>
                <button onclick="window.location.reload()" class="mt-6 text-primary font-bold hover:underline">Reset All Filters</button>
            </div>`;
    } else {
        const sorted = nearMe ? [...tutors].sort((a, b) => (a.simulated_distance || 99) - (b.simulated_distance || 99)) : tutors;
        resultsContainer.innerHTML = sorted.map(tutor => createTutorCard(tutor, aiMatchIds)).join('');
    }
}

function createTutorCard(tutor, aiMatchIds = []) {
    const isVerified = tutor.rating >= 4.7;
    const isElite = (tutor.experience || 0) >= 8;
    const isNearby = (tutor.simulated_distance || 99) <= 3;
    const isAIRecommended = aiMatchIds.map(String).includes(String(tutor.id));

    let badges = [];
    if (isAIRecommended) badges.push('AI Recommended');
    if (isNearby && badges.length < 2) badges.push('Nearby');
    if (isElite && badges.length < 2) badges.push('Elite Pro');
    if (isVerified && badges.length < 2 && !isElite) badges.push('Verified Expert');

    const stars = Array(5).fill(0).map((_, i) =>
        `<span class="material-symbols-outlined text-[10px] ${i < Math.floor(tutor.rating) ? 'text-amber-400' : 'text-slate-200'}">star</span>`
    ).join('');
    const trustScore = Math.min(98, 65 + (tutor.rating * 4) + ((tutor.experience || 1)) + Math.floor((tutor.view_count || 100) / 100));

    return `
        <div class="group relative bg-white rounded-[32px] border ${isAIRecommended ? 'border-primary ring-2 ring-primary/10' : 'border-slate-100'} p-6 transition-all duration-500 hover:shadow-[0_20px_50px_-15px_rgba(36,99,235,0.15)] hover:-translate-y-2">
            <div class="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                ${badges.map(b => `<div class="${b === 'AI Recommended' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'} text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">${b}</div>`).join('')}
            </div>
            <div class="flex items-start gap-6">
                <div class="w-20 h-20 rounded-[24px] overflow-hidden ring-4 ring-slate-50 group-hover:ring-primary/10 transition-all flex-shrink-0">
                    <img src="${tutor.image_url || `https://i.pravatar.cc/200?u=${tutor.id}`}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                </div>
                <div class="flex-1 pr-16">
                    <h3 class="text-lg font-black text-slate-900 leading-tight mb-1">${tutor.name}</h3>
                    <p class="text-[10px] font-black text-primary uppercase tracking-widest mb-2">${tutor.subject}</p>
                    <div class="flex items-center gap-3 mb-1">
                        <div class="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg">
                            <span class="text-[10px] font-black">${tutor.rating}</span>
                            <div class="flex">${stars}</div>
                        </div>
                        <span class="text-[10px] font-black text-slate-400 uppercase">${tutor.experience || 1} Years Exp.</span>
                    </div>
                    <div class="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3">Trust Score: ${trustScore}%</div>
                    <p class="text-[11px] text-slate-500 line-clamp-1">${tutor.about || `Expert ${tutor.subject} tutor in ${tutor.neighborhood || 'Delhi NCR'}.`}</p>
                </div>
            </div>
            <div class="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase mb-1">Hourly Rate</div>
                    <div class="flex items-baseline gap-1">
                        <span class="text-xl font-black text-slate-900">₹${tutor.price}</span>
                        <span class="text-xs font-bold text-slate-400">/hr</span>
                    </div>
                </div>
                <a href="tutor-profile.html?id=${tutor.id}" class="h-10 px-6 flex items-center justify-center rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95">
                    View Profile
                </a>
            </div>
        </div>`;
}

function showSkeletons() {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = Array(6).fill(0).map(() => `
        <div class="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-hidden">
            <div class="flex items-center gap-4 mb-6">
                <div class="skeleton w-16 h-16 rounded-xl"></div>
                <div class="space-y-2"><div class="skeleton w-32 h-4 rounded"></div><div class="skeleton w-24 h-3 rounded"></div></div>
            </div>
            <div class="skeleton w-full h-3 rounded mb-2"></div>
            <div class="skeleton w-2/3 h-3 rounded mb-6"></div>
            <div class="flex justify-between pt-4 border-t border-slate-100">
                <div class="skeleton w-16 h-8 rounded"></div><div class="skeleton w-24 h-8 rounded"></div>
            </div>
        </div>`).join('');
}

function debounce(func, wait) {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
}

async function aiAsk(presetQuery) {
    const inputEl = document.getElementById('ai-input');
    const messageContainer = document.getElementById('ai-messages');
    const query = presetQuery || inputEl?.value;
    if (!query) return;
    if (inputEl) inputEl.value = '';

    const userMsg = document.createElement('div');
    userMsg.className = 'bg-primary text-white p-4 rounded-2xl rounded-tr-none ml-auto max-w-[80%]';
    userMsg.innerHTML = `<p class="text-sm font-bold">${query}</p>`;
    messageContainer?.appendChild(userMsg);
    if (messageContainer) messageContainer.scrollTop = messageContainer.scrollHeight;

    setTimeout(async () => {
        const lowerQuery = query.toLowerCase();
        let feedback = "Searching the database for the best match...";

        if (lowerQuery.includes('physics')) { if (subjectFilter) subjectFilter.value = 'Physics'; feedback = "Found top Physics experts for you."; }
        else if (lowerQuery.includes('math')) { if (subjectFilter) subjectFilter.value = 'Mathematics'; feedback = "Showing specialized Math tutors."; }
        else if (lowerQuery.includes('bio')) { if (subjectFilter) subjectFilter.value = 'Biology'; feedback = "Listed the best Biology tutors."; }
        else if (lowerQuery.includes('chem')) { if (subjectFilter) subjectFilter.value = 'Chemistry'; feedback = "Showing Chemistry tutors near you."; }

        if (lowerQuery.includes('under') || lowerQuery.includes('cheap')) {
            const priceMatch = lowerQuery.match(/\d+/);
            if (maxPriceFilter) maxPriceFilter.value = priceMatch ? priceMatch[0] : '800';
            feedback += ` Budget filter applied.`;
        }
        if (lowerQuery.includes('near') || lowerQuery.includes('walk')) {
            if (distanceFilter) distanceFilter.value = '3';
            if (distanceValueEl) distanceValueEl.textContent = '3km';
            feedback += " Showing nearest tutors (3km).";
        }

        fetchAndRenderTutors();

        const aiMsg = document.createElement('div');
        aiMsg.className = 'bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100';
        aiMsg.innerHTML = `<p class="text-sm text-slate-600 font-bold">${feedback}</p>`;
        messageContainer?.appendChild(aiMsg);
        if (messageContainer) messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 600);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ai-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') aiAsk(); });
});

const style = document.createElement('style');
style.innerHTML = `@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`;
document.head.appendChild(style);
