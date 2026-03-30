require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');
const connectDB = require('./config/db');

const mockEvents = [
  {
    eventId: "evt-001",
    name: "TechTrek @ KSRCE",
    collegeName: "KSR College of Engineering",
    collegeDomain: "ksrce.ac.in",
    city: "Tiruchengode",
    venue: "Main Auditorium, KSRCE Campus",
    dateTime: "2026-03-12T10:00:00Z",
    capacity: 300,
    registeredCount: 204,
    status: "UPCOMING",
    description: "Join us at KSRCE for an immersive 1-day summit focusing on the future of AI and Cloud technologies in India. Hear from top industry leaders, participate in hands-on workshops, and network with peers.",
    topics: ["Artificial Intelligence", "Cloud Native", "Career Guidance"],
    speakers: [
      { name: "Rahul Sharma", role: "VP Strategy", company: "Infosys", bio: "Leading AI initiatives and enterprise transformation across global markets." },
      { name: "Priya Krishnan", role: "Founder", company: "GreenLeaf Ventures", bio: "Investor in deep-tech and climate solutions empowering next-gen founders." },
      { name: "Arjun Mehta", role: "Head of FinTech", company: "HDFC Bank", bio: "Pioneering the architecture behind India's digital payment revolution." }
    ],
    agenda: [
      { time: "09:30 AM", title: "Registrations & Welcome Networking", duration: "30 mins" },
      { time: "10:00 AM", title: "Keynote: India's Tech Decade & The AI Revolution", duration: "45 mins", speaker: "Rahul Sharma" },
      { time: "11:00 AM", title: "Fireside Chat: Building Green in Bharat", duration: "45 mins", speaker: "Priya Krishnan" },
      { time: "12:00 PM", title: "Technical Deep Dive: The Future of FinTech & UPI", duration: "60 mins", speaker: "Arjun Mehta" },
      { time: "01:00 PM", title: "Networking Lunch & Student Showcases", duration: "60 mins" }
    ],
    days: []
  },
  {
    eventId: "evt-002",
    name: "TechTrek @ IITM",
    collegeName: "IIT Madras",
    collegeDomain: "iitm.ac.in",
    city: "Chennai",
    venue: "IC&SR Auditorium",
    dateTime: "2026-04-15T09:30:00Z",
    capacity: 500,
    registeredCount: 480,
    status: "UPCOMING",
    description: "The flagship Chennai summit. Bringing together the brightest minds in deep tech, quantum computing, and robotics to discuss India's growing ecosystem.",
    topics: ["Quantum Computing", "Deep Tech", "Robotics"],
    speakers: [
      { name: "Dr. Anita Desai", role: "Chief Scientist", company: "QuantumCorp", bio: "Pioneer in quantum algorithms and cryptographic security." }
    ],
    agenda: [
      { time: "09:30 AM", title: "Opening Remarks & Breakfast", duration: "30 mins" },
      { time: "10:00 AM", title: "The Next Frontier: Quantum Supremacy in India", duration: "60 mins", speaker: "Dr. Anita Desai" },
      { time: "11:00 AM", title: "Hardware Startups scaling from Campus", duration: "45 mins" }
    ],
    days: []
  },
  {
    eventId: "evt-003",
    name: "TechTrek @ PSG",
    collegeName: "PSG College of Technology",
    collegeDomain: "psgtech.edu",
    city: "Coimbatore",
    venue: "Assembly Hall",
    dateTime: "2025-11-20T10:00:00Z",
    capacity: 250,
    registeredCount: 250,
    status: "COMPLETED",
    description: "Our inaugural Coimbatore event focusing on Industry 4.0, IoT, and Smart Manufacturing.",
    topics: ["IoT", "Smart Manufacturing", "Industry 4.0"],
    speakers: [
      { name: "Sanjay Kumar", role: "Director of IoT", company: "Bosch", bio: "Leading industrial automation integration for manufacturing sectors." }
    ],
    agenda: [
      { time: "10:00 AM", title: "Demystifying Industry 4.0", duration: "45 mins", speaker: "Sanjay Kumar" },
      { time: "11:00 AM", title: "Future of Connected Cars", duration: "60 mins" }
    ],
    days: []
  },
  {
    // ── MULTI-DAY EVENT ──────────────────────────────────────
    eventId: "evt-004",
    name: "TechTrek @ VIT Vellore",
    collegeName: "VIT Vellore",
    collegeDomain: "vit.ac.in",
    city: "Vellore",
    venue: "Anna Auditorium, VIT Campus",
    dateTime: "2026-05-08T09:00:00Z",
    endDateTime: "2026-05-09T17:00:00Z",   // 2-day event
    capacity: 600,
    registeredCount: 120,
    status: "UPCOMING",
    description: "TechTrek's first-ever 2-day summit at VIT Vellore — India's largest private university. Covering Generative AI, Cybersecurity, and the Future of Work across two action-packed days with workshops, panels, and a grand hackathon finale.",
    topics: ["Generative AI", "Cybersecurity", "Future of Work", "Hackathon"],
    speakers: [
      { name: "Kavya Nair",      role: "AI Research Lead",       company: "Google DeepMind India", bio: "Driving cutting-edge generative model research for the Indian developer ecosystem." },
      { name: "Rohit Verma",     role: "CISO",                   company: "Wipro",                 bio: "Building enterprise-grade zero-trust security frameworks for global clients." },
      { name: "Sunita Agarwal",  role: "VP Engineering",         company: "Zomato",                bio: "Scaled Zomato's platform to 500M users; advocate for women in technology leadership." }
    ],
    agenda: [],   // empty – multi-day uses the `days` array below
    days: [
      {
        day: 1,
        label: "Day 1 — AI & The Future",
        agenda: [
          { time: "09:00 AM", title: "Registration & Breakfast Networking",                       duration: "45 mins" },
          { time: "09:45 AM", title: "Inauguration & Welcome Address",                            duration: "30 mins" },
          { time: "10:15 AM", title: "Keynote: Generative AI — From Hype to Real Impact",         duration: "60 mins", speaker: "Kavya Nair" },
          { time: "11:30 AM", title: "Panel: Will AI Replace Engineers? A Student Perspective",   duration: "45 mins" },
          { time: "12:15 PM", title: "Lunch Break & Campus Tour",                                 duration: "60 mins" },
          { time: "01:15 PM", title: "Workshop: Build Your First LLM App in 90 Minutes",          duration: "90 mins", speaker: "Kavya Nair" },
          { time: "03:00 PM", title: "Lightning Talks: Student Innovations",                      duration: "60 mins" },
          { time: "04:00 PM", title: "Day 1 Closing & Hackathon Kickoff",                         duration: "45 mins" }
        ]
      },
      {
        day: 2,
        label: "Day 2 — Security & Career Summit",
        agenda: [
          { time: "09:00 AM", title: "Recap & Morning Energiser",                                 duration: "20 mins" },
          { time: "09:20 AM", title: "Keynote: Cybersecurity in the Age of AI",                   duration: "60 mins", speaker: "Rohit Verma" },
          { time: "10:30 AM", title: "Fireside Chat: Building a Career at Scale",                 duration: "45 mins", speaker: "Sunita Agarwal" },
          { time: "11:15 AM", title: "Workshop: Ethical Hacking Crash Course",                    duration: "90 mins", speaker: "Rohit Verma" },
          { time: "01:00 PM", title: "Lunch & Mentor Speed-Networking",                           duration: "60 mins" },
          { time: "02:00 PM", title: "Hackathon Final Presentations (Top 10 Teams)",              duration: "90 mins" },
          { time: "03:30 PM", title: "Prize Distribution & Closing Ceremony",                     duration: "60 mins" },
          { time: "04:30 PM", title: "Summit Valediction",                                        duration: "30 mins" }
        ]
      }
    ]
  }
];

const seedData = async () => {
  try {
    await connectDB();
    await Event.deleteMany(); // clear existing events
    await Event.insertMany(mockEvents);
    console.log('Events Seeded Successfully! (including 1 multi-day event)');
    process.exit();
  } catch (error) {
    console.error(`Error with seeding data: ${error.message}`);
    process.exit(1);
  }
};

seedData();
