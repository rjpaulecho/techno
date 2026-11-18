-- ============================================
-- TUTOFRIENDS
-- STEP 18: BOOKING PAYMENT PREPARATION
-- ============================================

USE tutofriends;

-- ============================================
-- 1. BOOKING PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS booking_payments (

    payment_id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

    booking_id BIGINT UNSIGNED NOT NULL,

    amount_due DECIMAL(10,2) NOT NULL,

    amount_paid DECIMAL(10,2)
        NOT NULL DEFAULT 0.00,

    amount_refunded DECIMAL(10,2)
        NOT NULL DEFAULT 0.00,

    currency CHAR(3)
        NOT NULL DEFAULT 'PHP',

    payment_status ENUM(
        'unpaid',
        'pending_verification',
        'paid',
        'refund_pending',
        'refunded'
    ) NOT NULL DEFAULT 'unpaid',

    payment_method VARCHAR(30) DEFAULT NULL,

    payment_reference VARCHAR(120) DEFAULT NULL,

    verified_by INT DEFAULT NULL,

    verified_at DATETIME DEFAULT NULL,

    paid_at DATETIME DEFAULT NULL,

    remarks VARCHAR(500) DEFAULT NULL,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_booking_payment
        UNIQUE (booking_id),

    CONSTRAINT fk_booking_payment_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_booking_payment_verifier
        FOREIGN KEY (verified_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_payment_amounts
        CHECK (
            amount_due > 0
            AND amount_paid >= 0
            AND amount_paid <= amount_due
            AND amount_refunded >= 0
            AND amount_refunded <= amount_paid
        ),

    INDEX idx_payment_status (
        payment_status
    )

) ENGINE=InnoDB;


-- ============================================
-- 2. PAYMENT STATUS HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS booking_payment_history (

    payment_history_id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

    payment_id BIGINT UNSIGNED NOT NULL,

    changed_by_user_id INT DEFAULT NULL,

    old_status ENUM(
        'unpaid',
        'pending_verification',
        'paid',
        'refund_pending',
        'refunded'
    ) DEFAULT NULL,

    new_status ENUM(
        'unpaid',
        'pending_verification',
        'paid',
        'refund_pending',
        'refunded'
    ) NOT NULL,

    remarks VARCHAR(500) DEFAULT NULL,

    changed_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_history_payment
        FOREIGN KEY (payment_id)
        REFERENCES booking_payments(payment_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_payment_history_user
        FOREIGN KEY (changed_by_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    INDEX idx_payment_history (
        payment_id,
        changed_at
    )

) ENGINE=InnoDB;


-- ============================================
-- 3. CREATE PAYMENT RECORDS
-- FOR EXISTING BOOKINGS
-- ============================================
-- Every existing booking begins with an
-- unpaid payment record.
--
-- This does NOT collect payment.
-- This does NOT mark any booking as paid.
--
-- Safe to rerun without duplicating existing
-- payment records.
-- ============================================

INSERT INTO booking_payments (
    booking_id,
    amount_due,
    amount_paid,
    amount_refunded,
    payment_status,
    currency
)
SELECT
    b.booking_id,
    b.total_amount,
    0.00,
    0.00,
    'unpaid',
    b.currency
FROM bookings b
LEFT JOIN booking_payments bp
    ON bp.booking_id = b.booking_id
WHERE bp.payment_id IS NULL;


-- ============================================
-- 4. INITIAL PAYMENT HISTORY
-- ============================================

INSERT INTO booking_payment_history (
    payment_id,
    changed_by_user_id,
    old_status,
    new_status,
    remarks
)
SELECT
    bp.payment_id,
    NULL,
    NULL,
    'unpaid',
    'Initial payment record; no payment collected'
FROM booking_payments bp
WHERE NOT EXISTS (
    SELECT 1
    FROM booking_payment_history h
    WHERE h.payment_id = bp.payment_id
      AND h.old_status IS NULL
      AND h.new_status = 'unpaid'
);


-- ============================================
-- 5. VERIFY PAYMENT RECORDS
-- ============================================

SELECT
    b.booking_id,
    b.booking_status,
    bp.payment_id,
    bp.amount_due,
    bp.amount_paid,
    bp.payment_status,
    bp.payment_method
FROM bookings b
LEFT JOIN booking_payments bp
    ON bp.booking_id = b.booking_id
ORDER BY b.booking_id DESC;