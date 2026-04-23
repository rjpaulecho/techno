export type TutorListing = {
  id: number;
  name: string;
  image: string;
  subject: string;
  services: string[];   // matches service tags from servicesData
  rate: string;
  rating: number;
  reviews: number;
  available: boolean;
};

export const catalogData: TutorListing[] = [
  {
    id: 1,
    name: "ralpp",
    image: "pics/ral.jpg",
    subject: "Mathematics",
    services: ["Popular", "Focused", "Quick Help"],
    rate: "₱300/hr",
    rating: 4.9,
    reviews: 42,
    available: true,
  },
  {
    id: 2,
    name: "Echonchon",
    image: "pics/chon.png",
    subject: "English & Writing",
    services: ["Beginner", "Quick Help"],
    rate: "₱200/hr",
    rating: 4.7,
    reviews: 31,
    available: true,
  },
  {
    id: 3,
    name: "calcal",
    image: "pics/acal.png",
    subject: "Science",
    services: ["Popular", "Focused"],
    rate: "₱280/hr",
    rating: 4.8,
    reviews: 27,
    available: false,
  },
  {
    id: 4,
    name: "conchon",
    image: "pics/chon.png",
    subject: "Web Development",
    services: ["Skill", "Popular"],
    rate: "₱350/hr",
    rating: 5.0,
    reviews: 19,
    available: true,
  },
  {
    id: 5,
    name: "glglg",
    image: "pics/lg.png",
    subject: "Filipino & History",
    services: ["Beginner", "Quick Help"],
    rate: "₱150/hr",
    rating: 4.6,
    reviews: 38,
    available: true,
  },
  {
    id: 6,
    name: "emienil",
    image: "pics/emi.png",
    subject: "Physics & Chemistry",
    services: ["Focused", "Skill"],
    rate: "₱320/hr",
    rating: 4.8,
    reviews: 22,
    available: true,
  },
  {
    id: 7,
    name: "eminl",
    image: "pics/emi.png",
    subject: "Programming",
    services: ["Skill", "Beginner"],
    rate: "₱300/hr",
    rating: 4.9,
    reviews: 15,
    available: false,
  },
  {
    id: 8,
    name: "rlp",
    image: "pics/ral.jpg",
    subject: "General Subjects",
    services: ["Beginner", "Quick Help", "Popular"],
    rate: "₱180/hr",
    rating: 4.5,
    reviews: 50,
    available: true,
  },
];