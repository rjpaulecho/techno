/* TUTOR/SERVICE DATA */

export interface Tutor {
  id: number;
  name: string;
  role: string;
  image: string;
  shortDesc: string;
  bio: string;
  expertise: string[];

}

export const tutorsData: Tutor[] = [
  {
    id: 1,
    name: "1",
    role: "Mathematics Tutor",
    image: "pics/ral.jpg",
    shortDesc: "Expert in calculus and algebra",
    bio: "Alex is a passionate mathematics educator with 8+ years of experience. Specializing in helping students master calculus, algebra, and advanced math concepts. Known for making complex topics simple and enjoyable.    bio: Alex is a passionate mathematics educator with 8+ years of experience. Specializing in helping students master calculus, algebra, and advanced math concepts. Known for making complex topics simple and enjoyable.Alex is a passionate mathematics educator with 8+ years of experience. Specializing in helping students master calculus, algebra, and advanced math concepts. Known for making complex topics simple and enjoyable.    bio: Alex is a passionate mathematics educator with 8+ years of experience. Specializing in helping students master calculus, algebra, and advanced math concepts. Known for making complex topics simple and enjoyable.Alex is a passionate mathematics educator with 8+ years of experience. Specializing in helping students master calculus, algebra, and advanced math concepts. Known for making complex topics simple and enjoyable.    bio: Alex is a passionate mathematics educator with 8+ years of experience. Specializing in helping students master calculus, algebra, and advanced math concepts. Known for making complex topics simple and enjoyable.Alex is a passionate mathematics educator with 8+ years of experience. Specializing in helping students master calculus, algebra, and advanced math concepts. Known for making complex topics simple and enjoyable.    bio: Alex is a passionate mathematics educator with 8+ years of experience. Specializing in helping students master calculus, algebra, and advanced math concepts. Known for making complex topics simple and enjoyable.",
    expertise: ["Calculus", "Algebra", "Pre-Calculus", "Statistics", "Geometry"],
    
  },
  {
    id: 2,
    name: "2",
    role: "Coding Mentor",
    image: "pics/chon.png",
    shortDesc: "Full-stack web development expert",
    bio: "Jordan specializes in teaching modern web development including React, Node.js, and full-stack applications. With 6+ years of industry experience, Jordan makes coding intuitive and practical for learners of all levels.",
    expertise: ["React", "JavaScript", "Node.js", "Python", "CSS"],
    
  },
  {
    id: 3,
    name: "3",
    role: "English & Writing Coach",
    image: "pics/acal.png",
    shortDesc: "Specialized in writing and communication",
    bio: "Sarah helps students develop strong writing skills and communication abilities. With a background in literature and journalism, she guides students through essays, creative writing, and public speaking with confidence.",
    expertise: ["Essay Writing", "Literature", "Grammar", "Public Speaking", "Creative Writing"],
    
  },
  {
    id: 4,
    name: "4",
    role: "Physics Specialist",
    image: "pics/lg.png",
    shortDesc: "Advanced physics and science tutor",
    bio: "Marcus brings physics alive through interactive problem-solving and real-world applications. With a Master's degree in Physics, he helps students understand complex theories through hands-on explanations and engaging examples.",
    expertise: ["Classical Mechanics", "Thermodynamics", "Electromagnetism", "Quantum Physics"],
    
  },
  {
    id: 5,
    name: "5",
    role: "Language Specialist",
    image: "pics/emi.png",
    shortDesc: "Spanish and French language expert",
    bio: "Emily specializes in teaching Spanish and French with immersive techniques. As a native bilingual speaker, she creates engaging lessons that build confidence and fluency in conversation, writing, and cultural understanding.",
    expertise: ["Spanish", "French", "Conversational Skills", "Grammar", "Culture"],
    
  },
  {
    id: 6,
    name: "6",
    role: "Business Coach",
    image: "pics/ral.jpg",
    shortDesc: "MBA-level business and entrepreneurship",
    bio: "David guides aspiring entrepreneurs and business professionals through strategy, marketing, and financial planning. With 12+ years in business leadership, he provides practical mentorship for startup success and career advancement.",
    expertise: ["Business Strategy", "Marketing", "Entrepreneurship", "Finance", "Leadership"],
    
  }
];
