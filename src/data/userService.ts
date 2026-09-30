export interface UserProfile {
  name: string;
  username?: string;
  email: string;
  password: string;
  role?: "student" | "tutor";
  bio: string;
  avatar: string;
  joinedAt: string;
}

const USER_KEY = "tutofriends_user";

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  username: "",
  email: "",
  password: "",
  role: "student",
  bio: "",
  avatar: "",
  joinedAt: new Date().toISOString(),
};

const TUTOR_ACCOUNTS: UserProfile[] = [
  {
    name: "Ralph",
    username: "tutor1",
    email: "tutor1@tutofriends.local",
    password: "123456789",
    role: "tutor",
    bio: "Tutor account for Ralph",
    avatar: "pics/ral.jpg",
    joinedAt: new Date().toISOString(),
  },
  {
    name: "RJ",
    username: "tutor2",
    email: "tutor2@tutofriends.local",
    password: "123456789",
    role: "tutor",
    bio: "Tutor account for RJ",
    avatar: "pics/chon.png",
    joinedAt: new Date().toISOString(),
  },
  {
    name: "Shane",
    username: "tutor3",
    email: "tutor3@tutofriends.local",
    password: "123456789",
    role: "tutor",
    bio: "Tutor account for Shane",
    avatar: "pics/emi.png",
    joinedAt: new Date().toISOString(),
  },
  {
    name: "LG",
    username: "tutor4",
    email: "tutor4@tutofriends.local",
    password: "123456789",
    role: "tutor",
    bio: "Tutor account for LG",
    avatar: "pics/lg.png",
    joinedAt: new Date().toISOString(),
  },
  {
    name: "Emnil",
    username: "tutor5",
    email: "tutor5@tutofriends.local",
    password: "123456789",
    role: "tutor",
    bio: "Tutor account for Emnil",
    avatar: "pics/acen.png",
    joinedAt: new Date().toISOString(),
  },
];

export const userService = {
  get(): UserProfile | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  save(profile: UserProfile): void {
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
  },

  register(name: string, email: string, password: string): UserProfile {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name,
      email,
      password,
      role: "student",
      joinedAt: new Date().toISOString(),
    };

    this.save(profile);
    return profile;
  },

  login(identifier: string, password: string): boolean {
    const input = identifier.trim().toLowerCase();

    // Check the five local tutor accounts first
    const tutor = TUTOR_ACCOUNTS.find(
      (account) =>
        account.username?.toLowerCase() === input ||
        account.email.toLowerCase() === input
    );

    if (tutor && tutor.password === password) {
      this.save(tutor);
      return true;
    }

    // Check the registered student account
    const stored = this.get();

    if (
      stored &&
      stored.role !== "tutor" &&
      stored.email.toLowerCase() === input &&
      stored.password === password
    ) {
      return true;
    }

    return false;
  },

  update(partial: Partial<UserProfile>): UserProfile {
    const current = this.get() ?? { ...DEFAULT_PROFILE };
    const updated = { ...current, ...partial };

    this.save(updated);
    return updated;
  },

  getInitials(name: string): string {
    return name
      .trim()
      .split(" ")
      .map((w) => w[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");
  },
};