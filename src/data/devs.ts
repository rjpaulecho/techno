/* TUTOR/SERVICE DATA */

export interface Tutor {
  id: number;
  name: string;
  role: string;
  image: string;
  shortDesc: string;
  bio: string;
  expertise: string[];
  contact?: {
    phone?: string;
    cell?: string;
    email?: string;
    facebook?: string;
    twitter?: string;
  };
}

export interface Leader {
  id: number;
  name: string;
  leadershipRole: "Founder" | "Co-Founder";
  role: string;
  image: string;
  quote: string;
  bio: string;
  contact?: {
    phone?: string;
    cell?: string;
    email?: string;
    facebook?: string;
    twitter?: string;
  };
}

export const tutorsData: Tutor[] = [
  {
    id: 1,
    name: "Ralph",
    role: "Dev",
    image: "pics/ral.jpg",
    shortDesc: "react and typescript expert",
    bio: "Ralph is a passionate developer with 5+ years of experience in React and TypeScript. Specializing in building modern, scalable web applications. Known for making complex topics simple and enjoyable.",
    expertise: ["Calculus", "Algebra", "Pre-Calculus", "Statistics", "Geometry"],
    contact: {
      email: "ralph@tutofriends.ph",
      facebook: "https://www.facebook.com/ralph.villon",
      twitter: "https://www.facebook.com/ralph.villon",
    },
  },
  {
    id: 2,
    name: "RJ",
    role: "Keyboard Warrior",
    image: "pics/chon.png",
    shortDesc: "Full-stack web development expert",
    bio: "67676776767676776767676767676767676767676767677676767767676767767667677",
    expertise: ["React", "JavaScript", "Node.js", "Python", "CSS"],
    contact: {
      email: "rj@tutofriends.ph",
      facebook: "https://www.facebook.com/rjpaul.echon",
      twitter: "https://www.facebook.com/ralph.villon",
    },
  },
  {
    id: 3,
    name: "Shane",
    role: "Code WArrior",
    image: "pics/acal.png",
    shortDesc: "Specialized in Roblox and Afking",
    bio: "Shane guides roblox players to his domain expansion",
    expertise: ["Essay Writing", "Literature", "Grammar", "Public Speaking", "Creative Writing"],
    contact: {
      email: "shane@tutofriends.ph",
      facebook: "https://facebook.com/shane",
      twitter: "https://www.facebook.com/ralph.villon",
    },
  },
  {
    id: 4,
    name: "LG",
    role: "MOney Tycoon",
    image: "pics/lg.png",
    shortDesc: "Advanced MOney Tycoon",
    bio: "LG brings money to life",
    expertise: ["Classical Mechanics", "Thermodynamics", "Electromagnetism", "Quantum Physics"],
    contact: {
      email: "lg@tutofriends.ph",
      facebook: "https://facebook.com/lg",
      twitter: "https://www.facebook.com/ralph.villon",
    },
  },
  {
    id: 5,
    name: "Emnil",
    role: "Gamer",
    image: "pics/emi.png",
    shortDesc: "English Or Spanish",
    bio: "THE FIRST ONE TO MOVE IS --- GAY El primero en moverse es gay.",
    expertise: ["Spanish", "French", "Conversational Skills", "Grammar", "Culture"],
    contact: {
      email: "emnil@tutofriends.ph",
      facebook: "https://facebook.com/emnil",
      twitter: "https://www.facebook.com/ralph.villon",
    },
  },
  {
    id: 6,
    name: "Bilway",
    role: "Encoder",
    image: "pics/bilway.jpg",
    shortDesc: "Contgact me for all your encoding needs",
    bio: "Bilway is a dedicated encoder who brings creativity and precision to every project.",
    expertise: ["Business Strategy", "Marketing", "Entrepreneurship", "Finance", "Leadership"],
    contact: {
      email: "bilway@tutofriends.ph",
      facebook: "https://facebook.com/amongus",
      twitter: "https://www.facebook.com/ralph.villon",
    },
  },
];

/* ─────────────────────────────────────────────────────────
   LEADERSHIP  —  add more contributors here too.
   To add a new contributor to tutorsData, copy any object
   above, give it a new unique id, and fill in the fields.
   They will automatically appear in both the About page
   team grid AND the Contact page 3-D carousel.
   ───────────────────────────────────────────────────────── */

export const leadershipData: Leader[] = [
  {
    id: 1,
    name: "Ralph",
    leadershipRole: "Founder",
    role: "Lead Developer & Visionary",
    image: "pics/ral.jpg",
    quote: "TutoFriends started with one idea: learning should feel safe.",
    bio: "Ralph founded TutoFriends to bridge the gap between students who need help and peers who want to give it. He leads development and product direction.",
    contact: {
      email: "ralph@tutofriends.ph",
      facebook: "https://www.facebook.com/ralph.villon",
      twitter: "https://www.facebook.com/ralph.villon",
    },
  },
  {
    id: 2,
    name: "RJ",
    leadershipRole: "Co-Founder",
    role: "Full-Stack Architect",
    image: "pics/chon.png",
    quote: "Good code is invisible — only the experience matters.",
    bio: "RJ co-founded TutoFriends and built the core platform architecture. He ensures the tech is fast, reliable, and ready to scale.",
    contact: {
      email: "rj@tutofriends.ph",
      facebook: "https://www.facebook.com/rjpaul.echon",
      twitter: "https://www.facebook.com/rjpaul.echon",
    },
  },
];