// server/seedAdmin.js
// One-time setup for the first TutoFriends administrator.

import "dotenv/config";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import db from "./db.js";

// ==========================================
// LOCAL DEVELOPMENT ADMIN ACCOUNT
// ==========================================

const admin = {
  full_name: "TutoFriends Administrator",
  username: "admin1",
  email: "admin@tutofriends.local",
};

// ==========================================
// CREATE ADMINISTRATOR
// ==========================================

async function createAdmin() {
  try {
    // Confirm the correct database.
    const [databaseRows] = await db.execute(
      "SELECT DATABASE() AS database_name"
    );

    const databaseName =
      databaseRows[0]?.database_name;

    if (databaseName !== "tutofriends") {
      throw new Error(
        `Wrong database: ${databaseName}. Expected tutofriends.`
      );
    }

    console.log("Connected to TutoFriends MySQL.");

    // Do not create another bootstrap admin.
    const [existingAdmins] = await db.execute(
      `
      SELECT
        user_id,
        username,
        email
      FROM users
      WHERE role = 'admin'
      LIMIT 1
      `
    );

    if (existingAdmins.length > 0) {
      console.log(
        "An administrator already exists."
      );

      console.log(
        "Username:",
        existingAdmins[0].username
      );

      console.log(
        "No account was created or changed."
      );

      return;
    }

    // Protect existing usernames and emails.
    const [duplicates] = await db.execute(
      `
      SELECT user_id
      FROM users
      WHERE username = ?
         OR email = ?
      LIMIT 1
      `,
      [admin.username, admin.email]
    );

    if (duplicates.length > 0) {
      throw new Error(
        "The administrator username or email is already in use."
      );
    }

    // Generate a strong, unique password.
    const generatedPassword = randomBytes(24)
      .toString("base64url");

    // Hash using the same bcrypt format as
    // the existing authentication system.
    const passwordHash = await bcrypt.hash(
      generatedPassword,
      12
    );

    // Insert an active administrator account.
    const [result] = await db.execute(
      `
      INSERT INTO users (
        full_name,
        username,
        email,
        password_hash,
        role,
        account_status
      )
      VALUES (
        ?, ?, ?, ?, 'admin', 'active'
      )
      `,
      [
        admin.full_name,
        admin.username,
        admin.email,
        passwordHash,
      ]
    );

    console.log("");
    console.log("ADMIN ACCOUNT CREATED");
    console.log("-----------------------------");

    console.log("User ID:", result.insertId);
    console.log("Name:", admin.full_name);
    console.log("Username:", admin.username);
    console.log("Email:", admin.email);
    console.log("Role: admin");
    console.log("Status: active");

    console.log("");
    console.log(
      "Generated password:",
      generatedPassword
    );

    console.log("");
    console.log(
      "Save this password in a secure password manager."
    );

    console.log(
      "It will not be displayed again by this script."
    );

  } catch (error) {
    console.error(
      "Admin creation failed:",
      error.message
    );

    process.exitCode = 1;

  } finally {
    await db.end();
  }
}

// ==========================================
// RUN ONCE
// ==========================================

await createAdmin();