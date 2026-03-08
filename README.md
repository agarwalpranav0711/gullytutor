Demo - https://drive.google.com/file/d/1grM62BtKWfrVFCe2iCISrdDRqMzW7ks2/view?usp=drive_link

Pitch - https://drive.google.com/file/d/1qrHfcEgi1Ythpk9z8FABMuGVrsoproiT/view?usp=drive_link

Vercel - https://vercel.com/ishan18190-8327s-projects/gullytutor

Website Link - https://gullytutor-zeta.vercel.app/index.html 

# 🎓 GullyTutor
### India's Hyperlocal Tutor Discovery Platform

> Find the best tutors within 5km of your home — like Swiggy, but for tutors in your gully.

**Built at Elite Hack 1.0 — 36 hours — Team of 2**

🔗 **Live Demo:** [gullytutor-zeta.vercel.app](https://gullytutor-zeta.vercel.app)

---

## 🚨 The Problem

Finding a tutor in India is broken:
- Students rely on word of mouth and WhatsApp groups
- No way to verify tutor credentials or ratings
- Expensive middlemen platforms with huge commission cuts
- No hyperlocal discovery — you don't know who's teaching 2 streets away

---

## ✅ Our Solution

GullyTutor is a two-sided marketplace connecting students with verified local tutors within a 5km radius — with real-time booking, trust scores, and zero commission.

---

## ✨ Features

### For Students
- 🔍 Search tutors by subject, price, rating, neighbourhood
- 📍 GPS-based "Find Tutors Near Me"
- 🗺️ Interactive map view of local tutors
- 📅 Book a free demo class in one click
- 📊 Dashboard to track all sent requests
- 🤖 AI assistant — type natural language like *"Physics tutors under ₹800"*

### For Tutors
- 📋 Performance dashboard with real-time inquiry notifications
- 📈 Stats — profile views, inquiry count, conversion rate
- ✅ Mark inquiries as replied
- 🏆 Trust Score — custom algorithm based on rating + experience + views

### Platform
- 🔐 Secure email/password authentication
- 👤 Role-based accounts (Student / Tutor)
- ⚡ Realtime updates via Supabase channels
- 📱 Fully responsive — works on mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3(Tailwind), JavaScript (ES6+,Vanila) |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Database | PostgreSQL with Row Level Security |
| Maps | Leaflet.js + OpenStreetMap |
| Deployment | Vercel |
| Animations | Canvas Confetti |

---

## 🗄️ Database Schema

```
profiles       — user accounts (student / tutor role)
tutors         — tutor listings with price, subject, location
inquiries      — booking requests from students to tutors
reviews        — ratings and feedback
```

All tables have **Row Level Security (RLS)** policies enabled.

---

## 🏗️ Architecture

```
Browser (HTML + Tailwind + Vanilla JS)
        │
        ▼
  Supabase JS SDK
        │
        ├── Auth (email/password)
        ├── PostgreSQL (tutors, inquiries, profiles)
        ├── Realtime (live inquiry notifications)
        └── RLS (data security per user)
        
Deployed on Vercel (static hosting)
```

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/ishan18190-collab/gullytutor.git
cd gullytutor
```

### 2. Configure Supabase
Open `js/supabase.js` and add your credentials:
```javascript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Set up the database
Run `sql/migration.sql` in your Supabase SQL Editor to create all tables, RLS policies and seed data.

### 4. Deploy
Push to GitHub and connect to Vercel — it deploys automatically.

---

## 📁 Project Structure

```
gullytutor/
├── index.html          # Landing page + auth modal
├── search.html         # Tutor search & discovery
├── dashboard.html      # Student & tutor dashboard
├── tutor-profile.html  # Individual tutor profile + booking
├── tutor-register.html # Tutor onboarding
├── js/
│   ├── supabase.js     # Supabase client init
│   ├── auth.js         # Auth helpers
│   ├── tutors.js       # All DB queries
│   ├── search.js       # Search & filter logic
│   ├── dashboard.js    # Dashboard logic
│   └── profile.js      # Profile page logic
├── css/                # Custom styles
└── sql/
    ├── schema.sql      # Table definitions
    └── migration.sql   # Full setup script with seed data
```

---

## 👥 Team

| Name | Role |
|------|------|
| Ishan Singh | Full Stack Development |
| Pranav Agarwal | Full Stack Development |

*Team of 2 — Elite Hack 1.0 — 36 hour hackathon*

---

## 🗺️ Roadmap

- [ ] Google OAuth login
- [ ] Razorpay payment integration
- [ ] Aadhaar-based tutor verification
- [ ] PostGIS real geolocation matching
- [ ] Mobile app (React Native)
- [ ] WhatsApp Business API integration
- [ ] Multi-city expansion beyond Delhi NCR

---

## 📄 License

MIT License — free to use and modify.

---

<p align="center">
  Built with ❤️ for Elite Hack 1.0 &nbsp;•&nbsp; GullyTutor © 2026
</p>
