export interface Booking {
  id: string;
  tutorId: number;
  tutorName: string;
  tutorImage: string;
  tutorSubject: string;
  tutorRate: string;
  date: string;
  time: string;
  duration: number;
  message: string;
  totalCost: number;
  status: "upcoming" | "completed" | "cancelled";
  paymentMethod: string; // e.g. "Card", "GCash", "Maya", "Cash"
  createdAt: string;
}

const STORAGE_KEY = "tutofriends_bookings";

export const bookingService = {
  getAll(): Booking[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  add(booking: Omit<Booking, "id" | "createdAt" | "status">): Booking {
    const all = this.getAll();
    const newBooking: Booking = {
      ...booking,
      id: crypto.randomUUID(),
      status: "upcoming",
      createdAt: new Date().toISOString(),
    };
    all.push(newBooking);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newBooking;
  },

  cancel(id: string): void {
    const all = this.getAll().map((b) =>
      b.id === id ? { ...b, status: "cancelled" as const } : b
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  remove(id: string): void {
    const all = this.getAll().filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  /** Marks any "upcoming" booking as "completed" if its date+time has passed. */
  autoComplete(): void {
    const now = new Date();
    let changed = false;
    const all = this.getAll().map((b) => {
      if (b.status !== "upcoming") return b;
      // Combine date + time into a comparable Date (assume 1-hour session minimum)
      const sessionEnd = new Date(`${b.date}T${b.time}`);
      sessionEnd.setHours(sessionEnd.getHours() + b.duration);
      if (sessionEnd <= now) {
        changed = true;
        return { ...b, status: "completed" as const };
      }
      return b;
    });
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },
};