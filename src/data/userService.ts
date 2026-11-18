// src/data/userService.ts
// MySQL-backed authentication: student, tutor, admin

export type UserRole = "student" | "tutor" | "admin";

export interface UserProfile {
  user_id?: number;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  bio: string;
  avatar: string;
  joinedAt: string;
  password?: string;
}

type ServerUser = {
  user_id?: number;
  full_name?: string;
  name?: string;
  username?: string | null;
  email?: string;
  role?: string;
  bio?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
};

type AuthResult = {
  success?: boolean;
  message?: string;
  user?: ServerUser;
};

const USER_KEY = "tutofriends_user";

// ==========================================
// ACCEPT ALL SUPPORTED ACCOUNT ROLES
// ==========================================

function serverRole(value: unknown): UserRole {
  const role = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    role === "student" ||
    role === "tutor" ||
    role === "admin"
  ) {
    return role;
  }

  throw new Error(
    "This account has an unsupported role."
  );
}

// ==========================================
// CONVERT MYSQL USER TO FRONTEND PROFILE
// ==========================================

function toProfile(user: ServerUser): UserProfile {
  return {
    user_id: user.user_id,
    name:
      user.full_name ??
      user.name ??
      user.username ??
      "User",
    username: user.username ?? "",
    email: user.email ?? "",
    role: serverRole(user.role),
    bio: user.bio ?? "",
    avatar: user.avatar_url ?? "",
    joinedAt:
      user.created_at ??
      new Date().toISOString(),
  };
}

// ==========================================
// PARSE API RESPONSE
// ==========================================

async function readResult(
  response: Response
): Promise<AuthResult> {
  const data = (await response
    .json()
    .catch(() => null)) as AuthResult | null;

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message ??
        `Authentication failed (HTTP ${response.status}).`
    );
  }

  return data;
}

// ==========================================
// USER SERVICE
// ==========================================

export const userService = {
  // ========================================
  // GET CACHED PROFILE
  // ========================================

  get(): UserProfile | null {
    try {
      const raw =
        localStorage.getItem(USER_KEY);

      if (!raw) return null;

      const profile =
        JSON.parse(raw) as UserProfile;

      if (
        !profile ||
        typeof profile !== "object"
      ) {
        return null;
      }

      // Remove passwords left by the old
      // localStorage-only implementation.

      if ("password" in profile) {
        delete profile.password;

        localStorage.setItem(
          USER_KEY,
          JSON.stringify(profile)
        );
      }

      return profile;
    } catch {
      return null;
    }
  },

  // ========================================
  // SAVE NON-SENSITIVE PROFILE DETAILS
  // ========================================

  save(profile: UserProfile): void {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      password: _discardedPassword,
      ...safeProfile
    } = profile;

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(safeProfile)
    );
  },

  // ========================================
  // LOGIN THROUGH MYSQL
  // ========================================

  async login(
    identifier: string,
    password: string
  ): Promise<UserProfile> {
    const response = await fetch(
      "/api/auth/login",
      {
        method: "POST",
        credentials: "same-origin",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      }
    );

    const data = await readResult(response);

    if (!data.user) {
      throw new Error(
        "Server did not return account information."
      );
    }

    // All three roles are accepted.
    // Admin is no longer blocked here.

    const profile = toProfile(data.user);

    this.save(profile);

    return profile;
  },

  // ========================================
  // RESTORE SERVER SESSION
  // ========================================

  async restore(): Promise<UserProfile | null> {
    try {
      const response = await fetch(
        "/api/auth/me",
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        localStorage.removeItem(USER_KEY);
        return null;
      }

      const data = await readResult(response);

      if (!data.user) {
        localStorage.removeItem(USER_KEY);
        return null;
      }

      const profile = toProfile(data.user);

      this.save(profile);

      return profile;
    } catch {
      return null;
    }
  },

  // ========================================
  // REGISTER STUDENT
  // ========================================

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<UserProfile> {
    const response = await fetch(
      "/api/auth/register",
      {
        method: "POST",
        credentials: "same-origin",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      }
    );

    const data = await readResult(response);

    if (!data.user) {
      throw new Error(
        "Registration succeeded, but account data is missing."
      );
    }

    // Registration creates a student account,
    // but does not automatically log it in.

    return toProfile(data.user);
  },

  // ========================================
  // UPDATE LOCALLY CACHED PROFILE
  // ========================================

  update(
    partial: Partial<UserProfile>
  ): UserProfile {
    const current = this.get();

    if (!current) {
      throw new Error(
        "Please log in again."
      );
    }

    // Never save a plaintext password
    // in localStorage.

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      password: _discardedPassword,
      ...safePartial
    } = partial;

    const updated: UserProfile = {
      ...current,
      ...safePartial,
    };

    this.save(updated);

    return updated;
  },

  // ========================================
  // LOGOUT
  // ========================================

  async logout(): Promise<void> {
    const response = await fetch(
      "/api/auth/logout",
      {
        method: "POST",
        credentials: "same-origin",
      }
    );

    if (
      !response.ok &&
      response.status !== 401
    ) {
      throw new Error(
        "Could not sign out. Please retry."
      );
    }

    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("loggedIn");
  },

  // ========================================
  // PROFILE INITIALS
  // ========================================

  getInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase() ?? ""
      )
      .join("");
  },
};