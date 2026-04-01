export interface Speaker {
  id: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  image?: string;
  headline?: string;
  tags?: string[];
  date?: string;
  duration?: string;
}

export interface AgendaItem {
  time: string;
  title: string;
  duration: string;
  speaker?: string;
}

export interface TechEvent {
  id: string;
  eventId?: string;
  _id?: string;
  name: string;
  collegeName: string;
  city: string;
  venue: string;
  dateTime: string;
  capacity: number;
  registeredCount: number;
  status: 'UPCOMING' | 'COMPLETED';
  description: string;
  agenda: AgendaItem[];
  speakers: Speaker[];
  topics: string[];
}

export const mockEvents: TechEvent[] = [
  {
    id: "evt-001",
    name: "TechTrek @ KSRCE",
    collegeName: "KSR College of Engineering",
    city: "Tiruchengode",
    venue: "Main Auditorium, KSRCE Campus",
    dateTime: "2026-03-12T10:00:00Z",
    capacity: 300,
    registeredCount: 204,
    status: "UPCOMING",
    description: "Join us at KSRCE for an immersive 1-day summit focusing on the future of AI and Cloud technologies in India. Hear from top industry leaders, participate in hands-on workshops, and network with peers.",
    topics: ["Artificial Intelligence", "Cloud Native", "Career Guidance"],
    speakers: [
      { id: "s1", name: "Rahul Sharma", role: "VP Strategy", company: "Infosys", bio: "Leading AI initiatives and enterprise transformation across global markets.", headline: "India's $1T Tech Dream", tags: ["#AI", "#TECHINDUSTRY"], date: "Mar 12, 10:00 AM", duration: "45 mins" },
      { id: "s2", name: "Priya Krishnan", role: "Founder", company: "GreenLeaf Ventures", bio: "Investor in deep-tech and climate solutions empowering next-gen founders.", headline: "Building Green in Bharat", tags: ["#CLIMATE", "#STARTUPS"], date: "Mar 12, 11:30 AM", duration: "30 mins" },
      { id: "s3", name: "Arjun Mehta", role: "Head of FinTech", company: "HDFC Bank", bio: "Pioneering the architecture behind India's digital payment revolution.", headline: "The Future of FinTech", tags: ["#FINTECH", "#UPI"], date: "Mar 12, 02:00 PM", duration: "60 mins" },
      { id: "s4", name: "Dr. Anita Desai", role: "Chief Scientist", company: "QuantumCorp", bio: "Pioneer in quantum algorithms and cryptographic security.", headline: "Quantum Supremacy in India", tags: ["#QUANTUM", "#DEEPTECH"], date: "Mar 12, 03:30 PM", duration: "45 mins" }
    ],
    agenda: [
      { time: "09:30 AM", title: "Registrations & Welcome Networking", duration: "30 mins" },
      { time: "10:00 AM", title: "Keynote: India's Tech Decade & The AI Revolution", duration: "45 mins", speaker: "Rahul Sharma" },
      { time: "11:00 AM", title: "Fireside Chat: Building Green in Bharat", duration: "45 mins", speaker: "Priya Krishnan" },
      { time: "12:00 PM", title: "Technical Deep Dive: The Future of FinTech & UPI", duration: "60 mins", speaker: "Arjun Mehta" },
      { time: "01:00 PM", title: "Networking Lunch & Student Showcases", duration: "60 mins" }
    ]
  },
  {
    id: "evt-002",
    name: "TechTrek @ IITM",
    collegeName: "IIT Madras",
    city: "Chennai",
    venue: "IC&SR Auditorium",
    dateTime: "2026-04-15T09:30:00Z",
    capacity: 500,
    registeredCount: 480,
    status: "UPCOMING",
    description: "The flagship Chennai summit. Bringing together the brightest minds in deep tech, quantum computing, and robotics to discuss India's growing ecosystem.",
    topics: ["Quantum Computing", "Deep Tech", "Robotics"],
    speakers: [
      { id: "s4", name: "Dr. Anita Desai", role: "Chief Scientist", company: "QuantumCorp", bio: "Pioneer in quantum algorithms and cryptographic security." }
    ],
    agenda: [
      { time: "09:30 AM", title: "Opening Remarks & Breakfast", duration: "30 mins" },
      { time: "10:00 AM", title: "The Next Frontier: Quantum Supremacy in India", duration: "60 mins", speaker: "Dr. Anita Desai" },
      { time: "11:00 AM", title: "Hardware Startups scaling from Campus", duration: "45 mins" }
    ]
  },
  {
    id: "evt-003",
    name: "TechTrek @ PSG",
    collegeName: "PSG College of Technology",
    city: "Coimbatore",
    venue: "Assembly Hall",
    dateTime: "2025-11-20T10:00:00Z",
    capacity: 250,
    registeredCount: 250,
    status: "COMPLETED",
    description: "Our inaugural Coimbatore event focusing on Industry 4.0, IoT, and Smart Manufacturing.",
    topics: ["IoT", "Smart Manufacturing", "Industry 4.0"],
    speakers: [
      { id: "s5", name: "Sanjay Kumar", role: "Director of IoT", company: "Bosch", bio: "Leading industrial automation integration for manufacturing sectors." }
    ],
    agenda: [
      { time: "10:00 AM", title: "Demystifying Industry 4.0", duration: "45 mins", speaker: "Sanjay Kumar" },
      { time: "11:00 AM", title: "Future of Connected Cars", duration: "60 mins" }
    ]
  }
];
