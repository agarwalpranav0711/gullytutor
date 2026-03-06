/**
 * GullyTutor Data Service - Handles all Supabase interactions
 * Optimized for Indian localization (Rupees, KM, CBSE/JEE/NEET tags)
 */

const tutorsTable = 'tutors';
const inquiriesTable = 'inquiries';

window.tutorService = {
    /**
     * Fetch tutors with optional filtering and sorting
     */
    async fetchTutors({ subject, minPrice, maxPrice, distance, sortBy, userLat, userLng, nearMe }) {
        try {
            let query = window.supabaseClient
                .from(tutorsTable)
                .select('*');

            if (subject) {
                query = query.ilike('subject', `%${subject}%`);
            }
            if (minPrice) {
                query = query.gte('price', minPrice);
            }
            if (maxPrice) {
                query = query.lte('price', maxPrice);
            }

            // Sorting
            if (sortBy === 'price_low') {
                query = query.order('price', { ascending: true });
            } else if (sortBy === 'price_high') {
                query = query.order('price', { ascending: false });
            } else if (sortBy === 'experience') {
                query = query.order('experience', { ascending: false });
            } else {
                query = query.order('rating', { ascending: false });
            }

            const { data, error } = await query;
            if (error) throw error;

            // Distance Calculation & Filtering
            let processedTutors = data.map(tutor => {
                let dist = tutor.simulated_distance || (tutor.id % 8) + 1;

                if (userLat && userLng && tutor.lat && tutor.lng) {
                    dist = this.calculateDistance(userLat, userLng, tutor.lat, tutor.lng);
                }

                return { ...tutor, simulated_distance: parseFloat(dist).toFixed(1) };
            });

            if (nearMe) {
                processedTutors = processedTutors.filter(t => parseFloat(t.simulated_distance) <= 3);
            } else if (distance && distance < 15) {
                processedTutors = processedTutors.filter(t => parseFloat(t.simulated_distance) <= distance);
            }

            return processedTutors;

        } catch (error) {
            console.error('GullyTutor Fetch Error:', error);
            return [];
        }
    },

    /**
     * Haversine formula to calculate distance in KM
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(2));
    },

    /**
     * Fetch a single tutor by ID
     */
    async fetchTutorById(id) {
        if (!id) return null;
        try {
            const { data, error } = await window.supabaseClient
                .from(tutorsTable)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('GullyTutor FetchById Error:', error);
            return null;
        }
    },

    /**
     * Increment view count (Simple Analytics)
     */
    async incrementTutorView(id) {
        if (!id) return;
        try {
            // Attempt RPC first (for scalability)
            const { error: rpcError } = await window.supabaseClient.rpc('increment_view_count', { tutor_id: id });

            // If RPC is missing or fails, use manual update as fallback
            if (rpcError) {
                // Check if column exists by attempting to select it
                const { data: tutor, error: fetchError } = await window.supabaseClient
                    .from(tutorsTable)
                    .select('id') // Select ID first to verify row exists
                    .eq('id', id)
                    .single();

                if (!fetchError && tutor) {
                    // Try to increment - this might fail if view_count is missing
                    const { error: updateError } = await window.supabaseClient
                        .from(tutorsTable)
                        .update({ view_count: 0 }) // Dummy update to check column
                        .eq('id', id);

                    if (!updateError) {
                        // If dummy update worked, do the real one
                        // Note: For real simplicity, we could just do one update with (view_count + 1)
                        // but Supabase client doesn't support increment directly without RPC or fetch-then-update
                        const { data: t } = await window.supabaseClient.from(tutorsTable).select('view_count').eq('id', id).single();
                        await window.supabaseClient.from(tutorsTable).update({ view_count: (t.view_count || 0) + 1 }).eq('id', id);
                    }
                }
            }
        } catch (e) {
            // Silently fail for analytics if DB column hasn't updated yet
        }
    },

    /**
     * Submit a student inquiry
     */
    async submitInquiry(inquiryData) {
        try {
            const { data, error } = await window.supabaseClient
                .from(inquiriesTable)
                .insert([inquiryData]);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('GullyTutor Inquiry Error:', error);
            throw error;
        }
    },

    /**
     * AI Recommendation Algorithm
     * score = rating * 2 + experience * 1 + distance_weight + price_affordability
     */
    async getAIRecommendations(subject, budget) {
        try {
            const tutors = await this.fetchTutors({ subject });
            if (!tutors || tutors.length === 0) return [];

            const scoredTutors = tutors.map(tutor => {
                const ratingScore = (tutor.rating || 0) * 2;
                const experienceScore = Math.min((tutor.experience || 0), 10);

                // Simulating distance for score
                const dist = tutor.simulated_distance || ((tutor.id % 8) + 1);
                const distanceScore = Math.max(0, 10 - dist); // Higher score for closer tutors

                // Price affordability (Higher score if well within budget)
                let priceScore = 0;
                if (budget) {
                    const diff = budget - tutor.price;
                    priceScore = diff > 0 ? Math.min(dist * 0.5, 5) : -5;
                } else {
                    priceScore = Math.max(0, (2000 - tutor.price) / 200);
                }

                const totalScore = ratingScore + experienceScore + distanceScore + priceScore;

                return {
                    ...tutor,
                    ai_score: totalScore.toFixed(1)
                };
            });

            // Sort by score and take top 3
            return scoredTutors.sort((a, b) => b.ai_score - a.ai_score).slice(0, 3);
        } catch (e) {
            console.error('AI Match Error:', e);
            return [];
        }
    },

    /**
     * Demo Mode Check
     */
    async ensureDemoData() {
        const { count, error } = await window.supabaseClient
            .from(tutorsTable)
            .select('*', { count: 'exact', head: true });

        if (!error && count === 0) {
            return false;
        }
        return true;
    }
};
