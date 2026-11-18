-- ============================================
-- TUTOFRIENDS DATABASE
-- STEP 9: TUTOR PROFILES, SUBJECTS,
-- OFFERINGS, AND AVAILABILITY
-- ============================================

USE tutofriends;


-- ============================================
-- 1. TUTOR PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS tutor_profiles (
    tutor_id INT NOT NULL PRIMARY KEY,

    headline VARCHAR(160) DEFAULT NULL,

    years_experience SMALLINT UNSIGNED DEFAULT NULL,

    availability_status
        ENUM('available', 'unavailable')
        NOT NULL DEFAULT 'unavailable',

    timezone VARCHAR(64)
        NOT NULL DEFAULT 'Asia/Manila',

    is_listed TINYINT(1)
        NOT NULL DEFAULT 0,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tutor_profiles_users
        FOREIGN KEY (tutor_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE

) ENGINE=InnoDB;


-- ============================================
-- 2. SUBJECTS
-- ============================================

CREATE TABLE IF NOT EXISTS subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,

    subject_name VARCHAR(150)
        NOT NULL UNIQUE,

    slug VARCHAR(160)
        NOT NULL UNIQUE,

    is_active TINYINT(1)
        NOT NULL DEFAULT 1,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB;


-- ============================================
-- 3. TUTOR SUBJECT OFFERINGS
-- ============================================

CREATE TABLE IF NOT EXISTS tutor_subjects (
    offering_id INT AUTO_INCREMENT PRIMARY KEY,

    tutor_id INT NOT NULL,

    subject_id INT NOT NULL,

    hourly_rate DECIMAL(10,2) NOT NULL,

    is_active TINYINT(1)
        NOT NULL DEFAULT 1,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_offering_tutor
        FOREIGN KEY (tutor_id)
        REFERENCES tutor_profiles(tutor_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_offering_subject
        FOREIGN KEY (subject_id)
        REFERENCES subjects(subject_id),

    CONSTRAINT uq_tutor_subject
        UNIQUE (tutor_id, subject_id),

    CONSTRAINT chk_positive_hourly_rate
        CHECK (hourly_rate > 0)

) ENGINE=InnoDB;


-- ============================================
-- 4. TUTOR WEEKLY AVAILABILITY
-- ============================================

CREATE TABLE IF NOT EXISTS tutor_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,

    tutor_id INT NOT NULL,

    day_of_week TINYINT UNSIGNED NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    is_active TINYINT(1)
        NOT NULL DEFAULT 1,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_availability_tutor
        FOREIGN KEY (tutor_id)
        REFERENCES tutor_profiles(tutor_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_tutor_weekly_slot
        UNIQUE (
            tutor_id,
            day_of_week,
            start_time,
            end_time
        ),

    CONSTRAINT chk_weekday
        CHECK (day_of_week BETWEEN 1 AND 7),

    CONSTRAINT chk_availability_time
        CHECK (start_time < end_time)

) ENGINE=InnoDB;


-- ============================================
-- 5. INSERT INITIAL SUBJECTS
-- ============================================

INSERT INTO subjects
    (subject_name, slug)
VALUES
    ('Mathematics', 'mathematics'),
    ('English & Writing', 'english-writing'),
    ('Science', 'science'),
    ('Web Development', 'web-development'),
    ('Filipino & History', 'filipino-history'),
    ('Physics & Chemistry', 'physics-chemistry'),
    ('Programming', 'programming'),
    ('General Subjects', 'general-subjects')

ON DUPLICATE KEY UPDATE
    subject_name = VALUES(subject_name);


-- ============================================
-- 6. CREATE PROFILES FOR EXISTING TUTORS
-- ============================================

INSERT INTO tutor_profiles (
    tutor_id,
    headline
)

SELECT
    u.user_id,
    'TutoFriends Tutor'

FROM users u

LEFT JOIN tutor_profiles tp
    ON tp.tutor_id = u.user_id

WHERE u.role = 'tutor'

AND u.username IN (
    'tutor1',
    'tutor2',
    'tutor3',
    'tutor4',
    'tutor5'
)

AND tp.tutor_id IS NULL;


-- ============================================
-- 7. VERIFY CREATED TABLES
-- ============================================

SHOW TABLES;