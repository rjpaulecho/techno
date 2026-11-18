// server/seedTutors.js
// Creates the five original tutor accounts in MySQL.
// Run once: node seedTutors.js

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import db from "./db.js";

const tutors = [
  {
    full_name: "Ralph",
    username: "tutor1",
    email: "tutor1@tutofriends.local",
    bio: "Tutor account for Ralph",
    avatar_url: "pics/ral.jpg",
  },
  {
    full_name: "RJ",
    username: "tutor2",
    email: "tutor2@tutofriends.local",
    bio: "Tutor account for RJ",
    avatar_url: "pics/chon.png",
  },
  {
    full_name: "Shane",
    username: "tutor3",
    email: "tutor3@tutofriends.local",
    bio: "Tutor account for Shane",
    avatar_url: "pics/acal.png",
  },
  {
    full_name: "LG",
    username: "tutor4",
    email: "tutor4@tutofriends.local",
    bio: "Tutor account for LG",
    avatar_url: "pics/lg.png",
  },
  {
    full_name: "Emnil",
    username: "tutor5",
    email: "tutor5@tutofriends.local",
    bio: "Tutor account for Emnil",
    avatar_url: "pics/emi.png",
  },
];

async function seedTutors() {
  let connection;
  let transactionStarted = false;

  const newAccounts = [];
  const existingAccounts = [];

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // ======================================
    // CREATE TUTOR ACCOUNTS
    // ======================================

    for (const tutor of tutors) {
      const [rows] = await connection.execute(
        `SELECT user_id, username, email, role
         FROM users
         WHERE username = ? OR email = ?`,
        [tutor.username, tutor.email]
      );

      // ====================================
      // PREVENT DUPLICATE ACCOUNTS
      // ====================================

      if (rows.length > 0) {
        const valid =
          rows.length === 1 &&
          rows[0].role === "tutor" &&
          rows[0].username?.toLowerCase() ===
            tutor.username &&
          rows[0].email.toLowerCase() ===
            tutor.email;

        if (!valid) {
          throw new Error(
            `Username/email conflict for ${tutor.username}. No accounts were changed.`
          );
        }

        existingAccounts.push(tutor.username);
        continue;
      }

      // ====================================
      // GENERATE SECURE PASSWORD
      // ====================================

      const password = randomBytes(18).toString(
        "base64url"
      );

      const passwordHash = await bcrypt.hash(
        password,
        12
      );

      // ====================================
      // INSERT INTO MYSQL
      // ====================================

      const [result] = await connection.execute(
        `INSERT INTO users
          (
            full_name,
            username,
            email,
            password_hash,
            role,
            bio,
            avatar_url,
            account_status
          )
         VALUES (
           ?, ?, ?, ?, 'tutor', ?, ?, 'active'
         )`,
        [
          tutor.full_name,
          tutor.username,
          tutor.email,
          passwordHash,
          tutor.bio,
          tutor.avatar_url,
        ]
      );

      newAccounts.push({
        user_id: result.insertId,
        tutor: tutor.full_name,
        username: tutor.username,
        password,
      });
    }

    // ======================================
    // SAVE ALL CHANGES
    // ======================================

    await connection.commit();
    transactionStarted = false;

    console.log(
      "\nTutor seed finished successfully."
    );

    // ======================================
    // DISPLAY NEW ACCOUNT CREDENTIALS
    // ======================================

    if (newAccounts.length > 0) {
      console.log(
        "\nNEW LOGIN CREDENTIALS — SAVE THESE LOCALLY:"
      );

      console.table(newAccounts);

      console.log(
        "These passwords are displayed only once. Do not commit or share them."
      );
    }

    if (existingAccounts.length > 0) {
      console.log(
        `\nAlready existed (passwords unchanged): ${existingAccounts.join(", ")}`
      );
    }

  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
    }

    console.error(
      "Tutor seeding failed:",
      error.message
    );

    process.exitCode = 1;

  } finally {
    if (connection) {
      connection.release();
    }

    await db.end();
  }
}

await seedTutors();