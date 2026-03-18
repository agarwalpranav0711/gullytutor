/**
 * GullyTutor — Tutor Service
 * All Supabase queries related to tutors.
 * Replaces the old seed_data.js + tutors.js mock approach.
 */

window.tutorService = {

  /**
   * Fetch tutors with optional filters
   */
  async fetchTutors({ subject = '', minPrice = 0, maxPrice = 10000, sortBy = 'rating', distance = 10 } = {}) {
    let query = window.supabaseClient
      .from('tutors')
      .select('*');

    if (subject && subject.trim() !== '') {
      query = query.ilike('subject', `%${subject.trim()}%`);
    }

    if (minPrice > 0) query = query.gte('price', minPrice);
    if (maxPrice < 10000) query = query.lte('price', maxPrice);

    if (sortBy === 'rating')      query = query.order('rating',     { ascending: false });
    else if (sortBy === 'price_asc')  query = query.order('price', { ascending: true });
    else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });
    else if (sortBy === 'experience') query = query.order('experience', { ascending: false });
    else                              query = query.order('rating',     { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('fetchTutors error:', error.message);
      return [];
    }

    // Simulate distance (replace with real geo query if you add PostGIS)
    return (data || []).map(t => ({
      ...t,
      simulated_distance: parseFloat((Math.random() * 8 + 0.5).toFixed(1))
    }));
  },

  /**
   * Fetch a single tutor by ID and increment view count
   */
  async fetchTutorById(id) {
    const { data, error } = await window.supabaseClient
      .from('tutors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('fetchTutorById error:', error.message);
      return null;
    }

    // Increment view count (fire and forget)
    window.supabaseClient
      .from('tutors')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id)
      .then(() => {});

    return data;
  },

  /**
   * Fetch top-rated tutors for a subject (used by AI match widget)
   */
  async getAIRecommendations(subject, maxBudget = 10000) {
    if (!subject || subject.trim() === '') return [];

    const { data, error } = await window.supabaseClient
      .from('tutors')
      .select('*')
      .ilike('subject', `%${subject.trim()}%`)
      .lte('price', maxBudget)
      .order('rating', { ascending: false })
      .limit(3);

    if (error) {
      console.error('getAIRecommendations error:', error.message);
      return [];
    }
    return data || [];
  },

  /**
   * Fetch reviews for a tutor
   */
  async fetchReviews(tutorId) {
    const { data, error } = await window.supabaseClient
      .from('reviews')
      .select('*, profiles(first_name, last_name, avatar_url)')
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchReviews error:', error.message);
      return [];
    }
    return data || [];
  },

  /**
   * Submit a student inquiry to a tutor
   */
  async submitInquiry({ tutorId, studentName, studentEmail, message }) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();

    const { error } = await window.supabaseClient
      .from('inquiries')
      .insert({
        tutor_id:      tutorId,
        student_id:    user?.id || null,
        student_name:  studentName,
        student_email: studentEmail,
        message:       message,
        status:        'new'
      });

    if (error) throw error;
    return true;
  },

  /**
   * Submit a review for a tutor
   */
  async submitReview({ tutorId, rating, comment }) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) throw new Error('You must be logged in to leave a review.');

    const { error } = await window.supabaseClient
      .from('reviews')
      .insert({
        tutor_id:   tutorId,
        student_id: user.id,
        rating:     rating,
        comment:    comment
      });

    if (error) throw error;

    // Recalculate average rating
    const { data: reviews } = await window.supabaseClient
      .from('reviews')
      .select('rating')
      .eq('tutor_id', tutorId);

    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await window.supabaseClient
        .from('tutors')
        .update({ rating: parseFloat(avg.toFixed(1)) })
        .eq('id', tutorId);
    }

    return true;
  },

  /**
   * Register or update a tutor profile
   */
  async upsertTutorProfile(tutorData) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) throw new Error('Not logged in');

    const { data, error } = await window.supabaseClient
      .from('tutors')
      .upsert({ ...tutorData, user_id: user.id }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
