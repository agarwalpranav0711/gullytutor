/**
 * GullyTutor India Seed Data
 * Optimized for Delhi NCR locations, ₹ Prices, and CBSE/JEE/NEET tags.
 */

const mockTutors = [
    {
        name: "Dr. Vikram Seth",
        subject: "Mathematics",
        experience: 12,
        price: 1200,
        rating: 4.9,
        location: "Dwarka",
        lat: 28.5921, lng: 77.0460,
        about: "IIT Delhi Alumnus. Specializing in JEE Mains & Advanced with 12+ years of experience. I focus on building core mathematical concepts and shortcut techniques.",
        specializations: JSON.stringify(["JEE Advanced", "Calculus", "CBSE Board", "Applied Math"]),
        view_count: 450,
        phone: "919810123456",
        email: "vikram.seth.maths@gmail.com",
        qualification: "IIT Delhi, PhD in Mathematics",
        image_url: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop"
    },
    {
        name: "Priyanka Sharma",
        subject: "Biology",
        experience: 6,
        price: 800,
        rating: 4.8,
        location: "Noida Sector 62",
        lat: 28.6276, lng: 77.3713,
        about: "NEET Biology expert. I help students memorize complex biological diagrams and processes through mnemonics. Focused on NCERT 11th & 12th.",
        specializations: JSON.stringify(["NEET Prep", "Botany", "Zoology", "NCERT Special"]),
        view_count: 280,
        phone: "919810654321",
        email: "priyanka.bio@gmail.com",
        qualification: "MSc Biotechnology, DU",
        image_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop"
    },
    {
        name: "Rahul Malhotra",
        subject: "Physics",
        experience: 8,
        price: 1000,
        rating: 4.7,
        location: "Gurgaon DLF",
        lat: 28.4595, lng: 77.0266,
        about: "Physics is all around us! My teaching style involves real-world examples to help students understand Newton's laws and Thermodynamics without rote learning.",
        specializations: JSON.stringify(["Physics Class 12", "Mechanics", "JEE Mains", "CUET"]),
        view_count: 320,
        phone: "919810888777",
        email: "rahul.physics.gully@gmail.com",
        qualification: "B.Tech Mechanical, NIT Kurukshetra",
        image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
    },
    {
        name: "Anita Gupta",
        subject: "Accounts",
        experience: 15,
        price: 1500,
        rating: 5.0,
        location: "Rohini",
        lat: 28.7041, lng: 77.1025,
        about: "Chartered Accountant by profession, Teacher by passion. Specializing in Class 11 & 12 Accountancy, Economics, and Business Studies.",
        specializations: JSON.stringify(["Accountancy", "Economics", "CUET", "CA Foundation"]),
        view_count: 512,
        phone: "919810111222",
        email: "anita.ca.tutor@gmail.com",
        qualification: "CA, M.Com",
        image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"
    }
];

async function seed() {
    console.log("--- Seeding GullyTutor India Data ---");

    if (!window.supabaseClient) {
        console.error("Supabase client not initialized. Check your js/supabase.js config.");
        return;
    }

    // Insert Tutors
    const { data: tutorsData, error: tutorsError } = await window.supabaseClient
        .from('tutors')
        .insert(mockTutors)
        .select();

    if (tutorsError) {
        console.error("Seeding Tutors failed:", tutorsError.message);
    } else {
        console.log(`Success! Seeded ${tutorsData.length} premium Indian tutors.`);

        // Optionally insert a test inquiry for the first tutor
        const firstTutorId = tutorsData[0].id;
        const { error: inqError } = await window.supabaseClient
            .from('inquiries')
            .insert([{
                tutor_id: firstTutorId,
                student_name: "Aryan Kapoor",
                message: "Looking for JEE Maths tuition near Dwarka Sector 10.",
                status: "new"
            }]);

        if (!inqError) console.log("Seeded 1 test inquiry for the dashboard.");
    }
}

console.log("To seed data, run: seed()");
