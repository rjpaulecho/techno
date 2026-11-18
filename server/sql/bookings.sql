-- ============================================
-- TUTOFRIENDS
-- STEP 13: MYSQL BOOKING SYSTEM
-- ============================================

USE tutofriends;

-- ============================================
-- 1. BOOKINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS bookings (

    booking_id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

    client_request_id CHAR(36) NOT NULL,

    student_id INT NOT NULL,

    offering_id INT NOT NULL,

    session_date DATE NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    duration_minutes SMALLINT UNSIGNED NOT NULL,

    hourly_rate_at_booking DECIMAL(10,2) NOT NULL,

    total_amount DECIMAL(10,2) NOT NULL,

    currency CHAR(3) NOT NULL DEFAULT 'PHP',

    student_message VARCHAR(1000) DEFAULT NULL,

    booking_status ENUM(
        'pending',
        'accepted',
        'declined',
        'cancelled',
        'completed',
        'expired'
    ) NOT NULL DEFAULT 'pending',

    pending_expires_at DATETIME DEFAULT NULL,

    decision_note VARCHAR(500) DEFAULT NULL,

    responded_at DATETIME DEFAULT NULL,

    cancelled_at DATETIME DEFAULT NULL,

    completed_at DATETIME DEFAULT NULL,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_booking_request
        UNIQUE (client_request_id),

    INDEX idx_booking_student (
        student_id,
        session_date,
        booking_status
    ),

    INDEX idx_booking_offering (
        offering_id,
        session_date,
        start_time,
        end_time
    ),

    INDEX idx_booking_pending (
        booking_status,
        pending_expires_at
    ),

    CONSTRAINT fk_booking_student
        FOREIGN KEY (student_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_booking_offering
        FOREIGN KEY (offering_id)
        REFERENCES tutor_subjects(offering_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_booking_times
        CHECK (start_time < end_time),

    CONSTRAINT chk_booking_duration
        CHECK (
            duration_minutes BETWEEN 30 AND 240
            AND MOD(duration_minutes, 30) = 0
        ),

    CONSTRAINT chk_booking_rate
        CHECK (hourly_rate_at_booking > 0),

    CONSTRAINT chk_booking_amount
        CHECK (total_amount > 0)

) ENGINE=InnoDB;


-- ============================================
-- 2. BOOKING STATUS HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS booking_status_history (

    history_id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

    booking_id BIGINT UNSIGNED NOT NULL,

    changed_by_user_id INT DEFAULT NULL,

    old_status ENUM(
        'pending',
        'accepted',
        'declined',
        'cancelled',
        'completed',
        'expired'
    ) DEFAULT NULL,

    new_status ENUM(
        'pending',
        'accepted',
        'declined',
        'cancelled',
        'completed',
        'expired'
    ) NOT NULL,

    reason VARCHAR(500) DEFAULT NULL,

    changed_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_booking_history (
        booking_id,
        changed_at
    ),

    CONSTRAINT fk_booking_history_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_booking_history_user
        FOREIGN KEY (changed_by_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL

) ENGINE=InnoDB;


-- ============================================
-- 3. VERIFY TABLES
-- ============================================

SHOW TABLES;

DESCRIBE bookings;

DESCRIBE booking_status_history;