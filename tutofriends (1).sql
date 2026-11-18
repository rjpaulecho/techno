-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3309
-- Generation Time: Nov 17, 2026 at 09:44 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tutofriends`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `client_request_id` char(36) NOT NULL,
  `student_id` int(11) NOT NULL,
  `offering_id` int(11) NOT NULL,
  `session_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `duration_minutes` smallint(5) UNSIGNED NOT NULL,
  `hourly_rate_at_booking` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'PHP',
  `student_message` varchar(1000) DEFAULT NULL,
  `booking_status` enum('pending','accepted','declined','cancelled','completed','expired') NOT NULL DEFAULT 'pending',
  `pending_expires_at` datetime DEFAULT NULL,
  `decision_note` varchar(500) DEFAULT NULL,
  `responded_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`booking_id`, `client_request_id`, `student_id`, `offering_id`, `session_date`, `start_time`, `end_time`, `duration_minutes`, `hourly_rate_at_booking`, `total_amount`, `currency`, `student_message`, `booking_status`, `pending_expires_at`, `decision_note`, `responded_at`, `cancelled_at`, `completed_at`, `created_at`, `updated_at`) VALUES
(2, '9c0ec07e-e95b-477a-9bd4-86d35dc63c00', 1, 1, '2026-10-28', '13:00:00', '14:00:00', 60, 300.00, 300.00, 'PHP', 'I need help with Mathematics.', 'accepted', '2026-10-25 21:42:48', NULL, '2026-10-25 02:19:31', NULL, NULL, '2026-10-24 21:42:48', '2026-10-25 02:19:31'),
(3, '01724b90-c3b8-42e0-9360-6e85e2dd7d72', 1, 1, '2026-10-26', '11:00:00', '12:00:00', 60, 300.00, 300.00, 'PHP', NULL, 'accepted', '2026-10-26 02:42:33', NULL, '2026-10-25 06:41:49', NULL, NULL, '2026-10-25 02:42:33', '2026-10-25 06:41:49'),
(4, 'f5a8c0ab-4a56-4069-bdd3-fc22f6ba792f', 1, 4, '2026-10-26', '09:00:00', '10:00:00', 60, 300.00, 300.00, 'PHP', NULL, 'accepted', '2026-10-26 02:58:31', NULL, '2026-10-25 06:41:51', NULL, NULL, '2026-10-25 02:58:31', '2026-10-25 06:41:51'),
(5, '0220a888-93d8-4080-9fd9-87939e8dc274', 1, 7, '2026-11-03', '09:00:00', '10:00:00', 60, 300.00, 300.00, 'PHP', NULL, 'accepted', '2026-10-30 12:22:23', NULL, '2026-10-29 12:23:38', NULL, NULL, '2026-10-29 12:22:23', '2026-10-29 12:23:38'),
(6, '1ec5925d-0ca7-48da-ad8f-248fc57ade73', 1, 6, '2026-11-17', '09:30:00', '12:00:00', 150, 300.00, 750.00, 'PHP', NULL, 'accepted', '2026-10-30 14:12:07', NULL, '2026-10-29 14:13:16', NULL, NULL, '2026-10-29 14:12:07', '2026-10-29 14:13:16');

-- --------------------------------------------------------

--
-- Table structure for table `booking_payments`
--

CREATE TABLE `booking_payments` (
  `payment_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `amount_due` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount_refunded` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` char(3) NOT NULL DEFAULT 'PHP',
  `payment_status` enum('unpaid','pending_verification','paid','refund_pending','refunded') NOT NULL DEFAULT 'unpaid',
  `payment_method` varchar(30) DEFAULT NULL,
  `payment_reference` varchar(120) DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `booking_payments`
--

INSERT INTO `booking_payments` (`payment_id`, `booking_id`, `amount_due`, `amount_paid`, `amount_refunded`, `currency`, `payment_status`, `payment_method`, `payment_reference`, `verified_by`, `verified_at`, `paid_at`, `remarks`, `created_at`, `updated_at`) VALUES
(1, 2, 300.00, 300.00, 0.00, 'PHP', 'paid', 'demo_gcash', 'TF-DEMO-aa07f8dd-57f7-4658-bff8-2e59b3328cf2', NULL, NULL, '2026-10-26 16:54:30', 'SIMULATED payment - no real funds were charged', '2026-10-25 02:47:27', '2026-10-26 16:54:30'),
(2, 3, 300.00, 0.00, 0.00, 'PHP', 'pending_verification', 'gcash', 'asdasd', NULL, NULL, NULL, 'Claim submitted; not yet verified', '2026-10-25 02:47:27', '2026-10-25 09:27:05'),
(4, 4, 300.00, 0.00, 0.00, 'PHP', 'unpaid', NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-25 02:58:31', '2026-10-25 02:58:31'),
(5, 5, 300.00, 300.00, 0.00, 'PHP', 'paid', 'demo_gcash', 'TF-DEMO-3612fb72-554f-41b3-beb5-441d628cf3b7', 9, '2026-10-29 12:26:10', '2026-10-29 12:26:10', 'SIMULATED payment approved by admin: qweqeqweqweqweqeqweqweqweqeqweqweqweqeqweqweqweqeqweqweqweqeqweqweqweqeqweqwe', '2026-10-29 12:22:23', '2026-10-29 12:26:10'),
(6, 6, 750.00, 750.00, 0.00, 'PHP', 'paid', 'demo_maya', 'TF-DEMO-1353316f-2fdc-41e3-9de0-95cb0f648ca1', 9, '2026-10-29 14:15:51', '2026-10-29 14:15:51', 'SIMULATED payment approved by admin: 12313131312312', '2026-10-29 14:12:07', '2026-10-29 14:15:51');

-- --------------------------------------------------------

--
-- Table structure for table `booking_payment_history`
--

CREATE TABLE `booking_payment_history` (
  `payment_history_id` bigint(20) UNSIGNED NOT NULL,
  `payment_id` bigint(20) UNSIGNED NOT NULL,
  `changed_by_user_id` int(11) DEFAULT NULL,
  `old_status` enum('unpaid','pending_verification','paid','refund_pending','refunded') DEFAULT NULL,
  `new_status` enum('unpaid','pending_verification','paid','refund_pending','refunded') NOT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `booking_payment_history`
--

INSERT INTO `booking_payment_history` (`payment_history_id`, `payment_id`, `changed_by_user_id`, `old_status`, `new_status`, `remarks`, `changed_at`) VALUES
(1, 1, NULL, NULL, 'unpaid', 'Initial payment record; no payment collected', '2026-10-25 02:47:27'),
(2, 2, NULL, NULL, 'unpaid', 'Initial payment record; no payment collected', '2026-10-25 02:47:27'),
(4, 4, NULL, NULL, 'unpaid', 'Initial payment record; no payment collected', '2026-10-25 02:58:31'),
(5, 1, 1, 'unpaid', 'pending_verification', 'Unverified gcash claim; reference TEST-dd7f845d-0c0c-4a49-a6bf-a5f5d1a78dfe', '2026-10-25 03:42:11'),
(6, 2, 1, 'unpaid', 'pending_verification', 'Unverified gcash claim; reference asdasd', '2026-10-25 09:27:05'),
(7, 1, 9, 'pending_verification', 'unpaid', 'Rejected gcash reference TEST-dd7f845d-0c0c-4a49-a6bf-a5f5d1a78dfe: Test payment claim only. No actual payment was received. Rejecting to prepare the booking for Xendit sandbox checkout.', '2026-10-25 20:08:25'),
(8, 1, 1, 'unpaid', 'pending_verification', 'Unverified gcash claim; reference asdasdasd', '2026-10-25 20:14:38'),
(9, 1, 9, 'pending_verification', 'unpaid', 'Rejected gcash reference asdasdasd: Test or demo payment claim rejected. No real payment is being approved.', '2026-10-25 20:15:53'),
(10, 1, 1, 'unpaid', 'paid', 'DEMO ONLY: fictional gcash checkout, receipt TF-DEMO-aa07f8dd-57f7-4658-bff8-2e59b3328cf2', '2026-10-26 16:54:30'),
(11, 5, NULL, NULL, 'unpaid', 'Initial payment record; no payment collected', '2026-10-29 12:22:23'),
(12, 5, 1, 'unpaid', 'pending_verification', 'DEMO ONLY: gcash fictional checkout awaiting admin review', '2026-10-29 12:24:19'),
(13, 5, 9, 'pending_verification', 'paid', 'DEMO ONLY: admin approved simulated receipt TF-DEMO-3612fb72-554f-41b3-beb5-441d628cf3b7: qweqeqweqweqweqeqweqweqweqeqweqweqweqeqweqweqweqeqweqweqweqeqweqweqweqeqweqwe', '2026-10-29 12:26:10'),
(14, 6, NULL, NULL, 'unpaid', 'Initial payment record; no payment collected', '2026-10-29 14:12:07'),
(15, 6, 1, 'unpaid', 'pending_verification', 'DEMO ONLY: maya fictional checkout awaiting admin review', '2026-10-29 14:14:43'),
(16, 6, 9, 'pending_verification', 'paid', 'DEMO ONLY: admin approved simulated receipt TF-DEMO-1353316f-2fdc-41e3-9de0-95cb0f648ca1: 12313131312312', '2026-10-29 14:15:51');

-- --------------------------------------------------------

--
-- Table structure for table `booking_revenue_splits`
--

CREATE TABLE `booking_revenue_splits` (
  `split_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `commission_bps` smallint(5) UNSIGNED NOT NULL,
  `platform_fee_amount` decimal(10,2) NOT NULL,
  `tutor_share_amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `booking_status_history`
--

CREATE TABLE `booking_status_history` (
  `history_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `changed_by_user_id` int(11) DEFAULT NULL,
  `old_status` enum('pending','accepted','declined','cancelled','completed','expired') DEFAULT NULL,
  `new_status` enum('pending','accepted','declined','cancelled','completed','expired') NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `booking_status_history`
--

INSERT INTO `booking_status_history` (`history_id`, `booking_id`, `changed_by_user_id`, `old_status`, `new_status`, `reason`, `changed_at`) VALUES
(1, 1, 8, NULL, 'pending', 'Student requested session', '2026-10-24 21:24:34'),
(2, 2, 1, NULL, 'pending', 'Student requested session', '2026-10-24 21:42:48'),
(3, 2, 3, 'pending', 'accepted', NULL, '2026-10-25 02:19:31'),
(4, 3, 1, NULL, 'pending', 'Student requested session', '2026-10-25 02:42:33'),
(5, 4, 1, NULL, 'pending', 'Student requested session', '2026-10-25 02:58:31'),
(6, 3, 3, 'pending', 'accepted', NULL, '2026-10-25 06:41:49'),
(7, 4, 3, 'pending', 'accepted', NULL, '2026-10-25 06:41:51'),
(8, 5, 1, NULL, 'pending', 'Student requested session', '2026-10-29 12:22:23'),
(9, 5, 4, 'pending', 'accepted', NULL, '2026-10-29 12:23:38'),
(10, 6, 1, NULL, 'pending', 'Student requested session', '2026-10-29 14:12:07'),
(11, 6, 4, 'pending', 'accepted', NULL, '2026-10-29 14:13:16');

-- --------------------------------------------------------

--
-- Table structure for table `demo_earnings_ledger`
--

CREATE TABLE `demo_earnings_ledger` (
  `ledger_id` bigint(20) UNSIGNED NOT NULL,
  `receipt_id` bigint(20) UNSIGNED NOT NULL,
  `beneficiary_type` enum('tutor','platform') NOT NULL,
  `beneficiary_user_id` int(11) DEFAULT NULL,
  `entry_type` enum('payment_credit','refund_debit') NOT NULL,
  `amount_delta_cents` bigint(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `demo_earnings_ledger`
--

INSERT INTO `demo_earnings_ledger` (`ledger_id`, `receipt_id`, `beneficiary_type`, `beneficiary_user_id`, `entry_type`, `amount_delta_cents`, `created_at`) VALUES
(1, 1, 'tutor', 3, 'payment_credit', 27000, '2026-10-26 16:54:30'),
(2, 1, 'platform', NULL, 'payment_credit', 3000, '2026-10-26 16:54:30'),
(3, 2, 'tutor', 4, 'payment_credit', 27000, '2026-10-29 12:26:10'),
(4, 2, 'platform', NULL, 'payment_credit', 3000, '2026-10-29 12:26:10'),
(5, 3, 'tutor', 4, 'payment_credit', 67500, '2026-10-29 14:15:51'),
(6, 3, 'platform', NULL, 'payment_credit', 7500, '2026-10-29 14:15:51');

-- --------------------------------------------------------

--
-- Table structure for table `demo_payment_attempts`
--

CREATE TABLE `demo_payment_attempts` (
  `attempt_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(11) NOT NULL,
  `payment_method` enum('gcash','maya','card','bank_transfer') NOT NULL,
  `source_last4` char(4) NOT NULL,
  `attempt_reference` varchar(80) NOT NULL,
  `attempt_status` enum('awaiting_otp','pending_review','paid','cancelled','expired') NOT NULL DEFAULT 'awaiting_otp',
  `expires_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `demo_payment_attempts`
--

INSERT INTO `demo_payment_attempts` (`attempt_id`, `booking_id`, `student_id`, `payment_method`, `source_last4`, `attempt_reference`, `attempt_status`, `expires_at`, `completed_at`, `created_at`) VALUES
(1, 2, 1, 'gcash', '3131', 'TF-ATTEMPT-a43927f8-f058-4928-82d5-8e7d422d916c', 'paid', '2026-10-26 17:04:27', '2026-10-26 16:54:30', '2026-10-26 16:54:27'),
(2, 5, 1, 'gcash', '1111', 'TF-ATTEMPT-e924096a-cacc-4938-b56c-99bf163c8741', 'paid', '2026-10-29 12:34:13', '2026-10-29 12:24:19', '2026-10-29 12:24:13'),
(3, 6, 1, 'maya', '3123', 'TF-ATTEMPT-86b50adb-56f7-4450-8203-4c490634ba00', 'paid', '2026-10-29 14:24:39', '2026-10-29 14:14:43', '2026-10-29 14:14:39');

-- --------------------------------------------------------

--
-- Table structure for table `demo_payment_receipts`
--

CREATE TABLE `demo_payment_receipts` (
  `receipt_id` bigint(20) UNSIGNED NOT NULL,
  `attempt_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(11) NOT NULL,
  `tutor_id` int(11) NOT NULL,
  `receipt_number` varchar(80) NOT NULL,
  `payment_method` enum('gcash','maya','card','bank_transfer') NOT NULL,
  `source_last4` char(4) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'PHP',
  `gross_cents` bigint(20) UNSIGNED NOT NULL,
  `commission_bps` smallint(5) UNSIGNED NOT NULL,
  `platform_fee_cents` bigint(20) UNSIGNED NOT NULL,
  `tutor_earnings_cents` bigint(20) UNSIGNED NOT NULL,
  `receipt_status` enum('paid','refunded') NOT NULL DEFAULT 'paid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `demo_payment_receipts`
--

INSERT INTO `demo_payment_receipts` (`receipt_id`, `attempt_id`, `booking_id`, `student_id`, `tutor_id`, `receipt_number`, `payment_method`, `source_last4`, `currency`, `gross_cents`, `commission_bps`, `platform_fee_cents`, `tutor_earnings_cents`, `receipt_status`, `created_at`) VALUES
(1, 1, 2, 1, 3, 'TF-DEMO-aa07f8dd-57f7-4658-bff8-2e59b3328cf2', 'gcash', '3131', 'PHP', 30000, 1000, 3000, 27000, 'paid', '2026-10-26 16:54:30'),
(2, 2, 5, 1, 4, 'TF-DEMO-3612fb72-554f-41b3-beb5-441d628cf3b7', 'gcash', '1111', 'PHP', 30000, 1000, 3000, 27000, 'paid', '2026-10-29 12:26:10'),
(3, 3, 6, 1, 4, 'TF-DEMO-1353316f-2fdc-41e3-9de0-95cb0f648ca1', 'maya', '3123', 'PHP', 75000, 1000, 7500, 67500, 'paid', '2026-10-29 14:15:51');

-- --------------------------------------------------------

--
-- Table structure for table `demo_tutor_withdrawals`
--

CREATE TABLE `demo_tutor_withdrawals` (
  `withdrawal_id` bigint(20) UNSIGNED NOT NULL,
  `tutor_id` int(11) NOT NULL,
  `account_email` varchar(255) NOT NULL,
  `withdrawal_reference` varchar(80) NOT NULL,
  `payout_method` enum('gcash','maya','bank_transfer') NOT NULL,
  `destination_last4` char(4) NOT NULL,
  `amount_cents` bigint(20) UNSIGNED NOT NULL,
  `balance_before_cents` bigint(20) UNSIGNED NOT NULL,
  `balance_after_cents` bigint(20) UNSIGNED NOT NULL,
  `withdrawal_status` enum('simulated') NOT NULL DEFAULT 'simulated',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `demo_tutor_withdrawals`
--

INSERT INTO `demo_tutor_withdrawals` (`withdrawal_id`, `tutor_id`, `account_email`, `withdrawal_reference`, `payout_method`, `destination_last4`, `amount_cents`, `balance_before_cents`, `balance_after_cents`, `withdrawal_status`, `created_at`) VALUES
(1, 3, 'tutor1@tutofriends.local', 'TF-WD-C65B2A97-C0B0-4FC5-9D89-BBD96974CA4F', 'gcash', '1234', 100, 27000, 26900, 'simulated', '2026-10-26 19:59:17'),
(2, 4, 'tutor2@tutofriends.local', 'TF-WD-92243A20-5AB7-4262-A4F2-0D686FDF8E44', 'gcash', '1234', 50000, 94500, 44500, 'simulated', '2026-10-29 14:17:38');

-- --------------------------------------------------------

--
-- Table structure for table `platform_fee_config`
--

CREATE TABLE `platform_fee_config` (
  `config_id` tinyint(3) UNSIGNED NOT NULL,
  `commission_bps` smallint(5) UNSIGNED NOT NULL DEFAULT 1000,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `platform_fee_config`
--

INSERT INTO `platform_fee_config` (`config_id`, `commission_bps`, `updated_at`) VALUES
(1, 1000, '2026-10-25 06:42:31');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `subject_id` int(11) NOT NULL,
  `subject_name` varchar(150) NOT NULL,
  `slug` varchar(160) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`subject_id`, `subject_name`, `slug`, `is_active`, `created_at`) VALUES
(1, 'Mathematics', 'mathematics', 1, '2026-10-24 09:28:38'),
(2, 'English & Writing', 'english-writing', 1, '2026-10-24 09:28:38'),
(3, 'Science', 'science', 1, '2026-10-24 09:28:38'),
(4, 'Web Development', 'web-development', 1, '2026-10-24 09:28:38'),
(5, 'Filipino & History', 'filipino-history', 1, '2026-10-24 09:28:38'),
(6, 'Physics & Chemistry', 'physics-chemistry', 1, '2026-10-24 09:28:38'),
(7, 'Programming', 'programming', 1, '2026-10-24 09:28:38'),
(8, 'General Subjects', 'general-subjects', 1, '2026-10-24 09:28:38'),
(9, 'animation', 'animation', 1, '2026-10-29 08:32:59'),
(10, 'gaming sackas', 'gaming-sackas', 1, '2026-10-29 13:55:28'),
(11, 'tekken gadas', 'tekken-gadas', 1, '2026-10-29 13:57:01'),
(12, 'gamba time', 'gamba-time', 1, '2026-10-29 13:57:58');

-- --------------------------------------------------------

--
-- Table structure for table `transaction_ticket_state`
--

CREATE TABLE `transaction_ticket_state` (
  `user_id` int(11) NOT NULL,
  `payment_id` bigint(20) UNSIGNED NOT NULL,
  `state` enum('history','archived','expired') NOT NULL DEFAULT 'history',
  `last_activity_at` datetime NOT NULL DEFAULT current_timestamp(),
  `archived_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transaction_ticket_state`
--

INSERT INTO `transaction_ticket_state` (`user_id`, `payment_id`, `state`, `last_activity_at`, `archived_at`, `created_at`) VALUES
(1, 1, 'history', '2026-10-27 00:54:30', NULL, '2026-10-29 14:23:38'),
(1, 2, 'history', '2026-10-25 17:27:05', NULL, '2026-10-29 14:23:38'),
(1, 5, 'history', '2026-10-29 20:26:10', NULL, '2026-10-29 14:23:38'),
(1, 6, 'history', '2026-10-29 22:15:51', NULL, '2026-10-29 14:23:38'),
(3, 1, 'history', '2026-10-29 14:10:30', NULL, '2026-10-29 13:50:20'),
(3, 2, 'history', '2026-10-29 14:09:50', NULL, '2026-10-29 13:50:20'),
(4, 5, 'history', '2026-10-29 20:26:10', NULL, '2026-10-29 14:17:03'),
(4, 6, 'history', '2026-10-29 22:15:51', NULL, '2026-10-29 14:17:03');

-- --------------------------------------------------------

--
-- Table structure for table `tutor_availability`
--

CREATE TABLE `tutor_availability` (
  `availability_id` int(11) NOT NULL,
  `tutor_id` int(11) NOT NULL,
  `day_of_week` tinyint(3) UNSIGNED NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `tutor_availability`
--

INSERT INTO `tutor_availability` (`availability_id`, `tutor_id`, `day_of_week`, `start_time`, `end_time`, `is_active`, `created_at`, `updated_at`) VALUES
(30, 3, 1, '09:00:00', '12:00:00', 1, '2026-10-24 21:19:43', '2026-10-24 21:19:43'),
(31, 3, 3, '13:00:00', '17:00:00', 1, '2026-10-24 21:19:43', '2026-10-24 21:23:20'),
(32, 3, 7, '09:00:00', '12:00:00', 1, '2026-10-24 21:19:43', '2026-10-24 21:19:43'),
(35, 4, 2, '09:00:00', '12:00:00', 1, '2026-10-26 20:37:47', '2026-10-26 20:37:47'),
(36, 4, 3, '09:00:00', '12:00:00', 1, '2026-10-26 20:37:47', '2026-10-26 20:37:47'),
(37, 10, 3, '09:00:00', '12:00:00', 1, '2026-10-26 21:11:19', '2026-10-26 21:11:19'),
(38, 10, 4, '09:00:00', '12:00:00', 1, '2026-10-26 21:11:19', '2026-10-26 21:11:19'),
(39, 10, 6, '09:00:00', '12:00:00', 1, '2026-10-26 21:11:19', '2026-10-26 21:11:19'),
(40, 10, 7, '09:00:00', '12:00:00', 1, '2026-10-26 21:11:19', '2026-10-26 21:11:19'),
(41, 11, 3, '09:00:00', '12:00:00', 1, '2026-10-28 13:57:06', '2026-10-28 13:57:06'),
(42, 11, 4, '09:00:00', '12:00:00', 1, '2026-10-28 13:57:06', '2026-10-28 13:57:06'),
(43, 11, 4, '21:00:00', '22:00:00', 1, '2026-10-28 13:57:06', '2026-10-28 13:57:06'),
(46, 5, 6, '09:00:00', '12:00:00', 1, '2026-10-29 13:56:02', '2026-10-29 13:56:02'),
(47, 5, 7, '09:00:00', '12:00:00', 1, '2026-10-29 13:56:02', '2026-10-29 13:56:02'),
(48, 6, 1, '09:00:00', '12:00:00', 1, '2026-10-29 13:57:24', '2026-10-29 13:57:24'),
(49, 6, 2, '09:00:00', '12:00:00', 1, '2026-10-29 13:57:24', '2026-10-29 13:57:24'),
(50, 6, 3, '09:00:00', '12:00:00', 1, '2026-10-29 13:57:24', '2026-10-29 13:57:24'),
(51, 7, 4, '09:00:00', '12:00:00', 1, '2026-10-29 13:58:15', '2026-10-29 13:58:15'),
(52, 7, 5, '09:00:00', '12:00:00', 1, '2026-10-29 13:58:15', '2026-10-29 13:58:15');

-- --------------------------------------------------------

--
-- Table structure for table `tutor_profiles`
--

CREATE TABLE `tutor_profiles` (
  `tutor_id` int(11) NOT NULL,
  `headline` varchar(160) DEFAULT NULL,
  `years_experience` smallint(5) UNSIGNED DEFAULT NULL,
  `availability_status` enum('available','unavailable') NOT NULL DEFAULT 'unavailable',
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Manila',
  `is_listed` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tutor_profiles`
--

INSERT INTO `tutor_profiles` (`tutor_id`, `headline`, `years_experience`, `availability_status`, `timezone`, `is_listed`, `created_at`, `updated_at`) VALUES
(3, 'TutoFriends Tutor', NULL, 'unavailable', 'Asia/Manila', 1, '2026-10-24 09:28:38', '2026-10-30 04:11:05'),
(4, 'TutoFriends Tutor', 5, 'available', 'Asia/Manila', 1, '2026-10-24 09:28:38', '2026-10-28 13:50:02'),
(5, 'TutoFriends Tutor', NULL, 'unavailable', 'Asia/Manila', 1, '2026-10-24 09:28:38', '2026-10-29 13:56:06'),
(6, 'TutoFriends Tutor', NULL, 'unavailable', 'Asia/Manila', 1, '2026-10-24 09:28:38', '2026-10-29 13:57:30'),
(7, 'TutoFriends Tutor', NULL, 'unavailable', 'Asia/Manila', 1, '2026-10-24 09:28:38', '2026-10-29 13:58:21'),
(10, 'qwe', 24, 'available', 'Asia/Manila', 0, '2026-10-26 21:10:38', '2026-10-26 21:13:52'),
(11, NULL, NULL, 'unavailable', 'Asia/Manila', 1, '2026-10-28 13:55:17', '2026-10-28 13:57:12');

-- --------------------------------------------------------

--
-- Table structure for table `tutor_subjects`
--

CREATE TABLE `tutor_subjects` (
  `offering_id` int(11) NOT NULL,
  `tutor_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `hourly_rate` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `tutor_subjects`
--

INSERT INTO `tutor_subjects` (`offering_id`, `tutor_id`, `subject_id`, `hourly_rate`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 3, 1, 300.00, 1, '2026-10-24 10:01:59', '2026-10-29 08:33:05'),
(2, 3, 7, 400.00, 0, '2026-10-24 10:01:59', '2026-10-24 10:17:42'),
(4, 3, 5, 300.00, 1, '2026-10-24 10:17:42', '2026-10-29 08:33:05'),
(5, 3, 8, 300.00, 1, '2026-10-24 10:17:42', '2026-10-29 08:33:05'),
(6, 4, 3, 300.00, 1, '2026-10-26 20:36:30', '2026-10-26 20:36:30'),
(7, 4, 7, 300.00, 1, '2026-10-26 20:36:30', '2026-10-26 20:36:30'),
(8, 10, 2, 299.97, 1, '2026-10-26 21:12:09', '2026-10-26 21:12:09'),
(9, 10, 5, 299.99, 1, '2026-10-26 21:12:09', '2026-10-26 21:12:09'),
(10, 10, 7, 301.00, 1, '2026-10-26 21:12:09', '2026-10-26 21:12:09'),
(11, 10, 8, 299.96, 1, '2026-10-26 21:12:09', '2026-10-26 21:12:09'),
(12, 11, 2, 300.00, 1, '2026-10-28 13:56:07', '2026-10-28 13:56:10'),
(13, 11, 7, 300.00, 1, '2026-10-28 13:56:07', '2026-10-28 13:56:10'),
(22, 3, 9, 300.00, 1, '2026-10-29 08:33:05', '2026-10-29 08:33:05'),
(23, 5, 10, 99999.00, 1, '2026-10-29 13:55:39', '2026-10-29 13:55:39'),
(24, 6, 11, 300.00, 1, '2026-10-29 13:57:06', '2026-10-29 13:57:06'),
(25, 7, 12, 300.00, 1, '2026-10-29 13:58:02', '2026-10-29 13:58:02');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('student','tutor','admin') NOT NULL DEFAULT 'student',
  `bio` text DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `account_status` enum('active','suspended') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `username`, `email`, `password_hash`, `role`, `bio`, `avatar_url`, `account_status`, `created_at`, `updated_at`) VALUES
(1, 'Test Student', NULL, 'teststudent1@example.com', '$2b$12$efx8kOYJZJUr6xjbAIqN5uiFEiGoP2cf.00PKwmntnxi9Z1lx3roS', 'student', NULL, NULL, 'active', '2026-10-24 08:23:47', '2026-10-24 08:23:47'),
(2, 'Andrew Test', NULL, 'andrewtest@example.com', '$2b$12$BXbcHGUl262rNLD74N47P.syMln/FqsV7z6lQtdakXP9/sUfp.BT6', 'student', NULL, NULL, 'active', '2026-10-24 08:36:25', '2026-10-24 08:36:25'),
(3, 'Ralph', 'tutor1', 'tutor1@tutofriends.local', '$2b$12$pvEaw3T6WExg7yinU3d3g.s4KFuNqTZ73ykQnWq4Yq5puywzkfqRa', 'tutor', 'Tutor account for Ralph', 'pics/ral.jpg', 'active', '2026-10-24 09:07:12', '2026-10-24 09:07:12'),
(4, 'RJ', 'tutor2', 'tutor2@tutofriends.local', '$2b$12$bB4yn/8LO0J7xdVb0Uq7NuEp.uI2iEXf0wwDxURV2bezhshbiyOiC', 'tutor', 'Tutor account for RJ', 'pics/chon.png', 'active', '2026-10-24 09:07:12', '2026-10-24 09:07:12'),
(5, 'Shane', 'tutor3', 'tutor3@tutofriends.local', '$2b$12$WUvtIlWWmR2W7T8L.NPWN.EbHUzm4zktSQ.SSA0lBraQ.xjP238l.', 'tutor', 'Tutor account for Shane', 'pics/acal.png', 'active', '2026-10-24 09:07:12', '2026-10-24 09:07:12'),
(6, 'LG', 'tutor4', 'tutor4@tutofriends.local', '$2b$12$.Xn7I9Yi0F8oV1gjxrnzdOnYBz9NVr38j5GXWi1zxYC4c0ZmblzOS', 'tutor', 'Tutor account for LG', 'pics/lg.png', 'active', '2026-10-24 09:07:13', '2026-10-24 09:07:13'),
(7, 'Emnil', 'tutor5', 'tutor5@tutofriends.local', '$2b$12$sfQxX0inpZNvVL5HPHMjdOh7cIEgO2y0RY57OGfbff2F3/OeSqaNi', 'tutor', 'Tutor account for Emnil', 'pics/emi.png', 'active', '2026-10-24 09:07:13', '2026-10-24 09:07:13'),
(8, 'echon', NULL, 'echon@gmail.com', '$2b$12$6QBtSIcTWOUzFn9VRZZeu.HH2coRMdpm6GGGWN70PIctxeUeOf/yy', 'student', NULL, NULL, 'active', '2026-10-24 10:29:49', '2026-10-24 10:29:49'),
(9, 'TutoFriends Administrator', 'admin1', 'admin@tutofriends.local', '$2b$12$nQGYJtHwT.z50VSMeGEQDuOhKz0OF9aoITaN./m8D9lC5VhVcAag.', 'admin', NULL, NULL, 'active', '2026-10-25 05:16:19', '2026-10-25 05:16:19'),
(10, 'qwe', 'qwe', 'qwe@gmail.com', '$2b$12$wvqGt5HqqHfs3yY4O8vMauiYxY0BcSpvE8yDnDZazVoLWrScspIr2', 'tutor', 'qwe', NULL, 'active', '2026-10-26 21:10:38', '2026-10-26 21:12:06'),
(11, '123', '123', '123@gmail.com', '$2b$12$DIDSyfXzdTrtOeacKxlC8OPnAGN1n0wfvU4sR7y0Hx0.tE5/Vanri', 'tutor', NULL, NULL, 'active', '2026-10-28 13:55:17', '2026-10-28 13:55:17');

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `session_hash` char(64) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_sessions`
--

INSERT INTO `user_sessions` (`session_hash`, `user_id`, `expires_at`, `created_at`) VALUES
('32905c8170679125e8e5fddcedabba959798464e1424adf562b66c32ac93f676', 3, '2026-10-30 08:46:10', '2026-10-29 08:46:10'),
('4cbb18e13d4930ad69d4adc30d484ca5205453a082835d79c05340cdeba09ec5', 1, '2026-10-30 14:27:25', '2026-10-29 14:27:25'),
('a6e15812abb98a2873b9b4540b418871df3b3d5242d99c3a660c54bce2fd7951', 1, '2026-10-31 04:11:10', '2026-10-30 04:11:10'),
('d504dfb1239952ccecedb362cb3e4e71b7ca5ce821a63eca294c3ec87068eb7e', 4, '2026-11-05 14:16:49', '2026-10-29 14:16:49');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD UNIQUE KEY `uq_booking_request` (`client_request_id`),
  ADD KEY `idx_booking_student` (`student_id`,`session_date`,`booking_status`),
  ADD KEY `idx_booking_offering` (`offering_id`,`session_date`,`start_time`,`end_time`),
  ADD KEY `idx_booking_pending` (`booking_status`,`pending_expires_at`);

--
-- Indexes for table `booking_payments`
--
ALTER TABLE `booking_payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD UNIQUE KEY `uq_booking_payment` (`booking_id`),
  ADD UNIQUE KEY `uq_payment_method_reference` (`payment_method`,`payment_reference`),
  ADD KEY `fk_booking_payment_verifier` (`verified_by`),
  ADD KEY `idx_payment_status` (`payment_status`);

--
-- Indexes for table `booking_payment_history`
--
ALTER TABLE `booking_payment_history`
  ADD PRIMARY KEY (`payment_history_id`),
  ADD KEY `fk_payment_history_user` (`changed_by_user_id`),
  ADD KEY `idx_payment_history` (`payment_id`,`changed_at`);

--
-- Indexes for table `booking_revenue_splits`
--
ALTER TABLE `booking_revenue_splits`
  ADD PRIMARY KEY (`split_id`),
  ADD UNIQUE KEY `booking_id` (`booking_id`);

--
-- Indexes for table `booking_status_history`
--
ALTER TABLE `booking_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `idx_booking_history` (`booking_id`,`changed_at`),
  ADD KEY `fk_booking_history_user` (`changed_by_user_id`);

--
-- Indexes for table `demo_earnings_ledger`
--
ALTER TABLE `demo_earnings_ledger`
  ADD PRIMARY KEY (`ledger_id`),
  ADD UNIQUE KEY `uq_demo_earning_entry` (`receipt_id`,`beneficiary_type`,`entry_type`),
  ADD KEY `idx_demo_earning_beneficiary` (`beneficiary_type`,`beneficiary_user_id`),
  ADD KEY `fk_demo_earning_user` (`beneficiary_user_id`);

--
-- Indexes for table `demo_payment_attempts`
--
ALTER TABLE `demo_payment_attempts`
  ADD PRIMARY KEY (`attempt_id`),
  ADD UNIQUE KEY `attempt_reference` (`attempt_reference`),
  ADD KEY `idx_demo_attempt_booking` (`booking_id`,`attempt_status`),
  ADD KEY `fk_demo_attempt_student` (`student_id`);

--
-- Indexes for table `demo_payment_receipts`
--
ALTER TABLE `demo_payment_receipts`
  ADD PRIMARY KEY (`receipt_id`),
  ADD UNIQUE KEY `attempt_id` (`attempt_id`),
  ADD UNIQUE KEY `booking_id` (`booking_id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `fk_demo_receipt_student` (`student_id`),
  ADD KEY `fk_demo_receipt_tutor` (`tutor_id`);

--
-- Indexes for table `demo_tutor_withdrawals`
--
ALTER TABLE `demo_tutor_withdrawals`
  ADD PRIMARY KEY (`withdrawal_id`),
  ADD UNIQUE KEY `uq_demo_withdrawal_reference` (`withdrawal_reference`),
  ADD KEY `idx_demo_withdrawals_tutor_date` (`tutor_id`,`created_at`);

--
-- Indexes for table `platform_fee_config`
--
ALTER TABLE `platform_fee_config`
  ADD PRIMARY KEY (`config_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`subject_id`),
  ADD UNIQUE KEY `subject_name` (`subject_name`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `transaction_ticket_state`
--
ALTER TABLE `transaction_ticket_state`
  ADD PRIMARY KEY (`user_id`,`payment_id`),
  ADD KEY `idx_ticket_lifecycle` (`state`,`last_activity_at`),
  ADD KEY `fk_ticket_payment` (`payment_id`);

--
-- Indexes for table `tutor_availability`
--
ALTER TABLE `tutor_availability`
  ADD PRIMARY KEY (`availability_id`),
  ADD UNIQUE KEY `uq_tutor_weekly_slot` (`tutor_id`,`day_of_week`,`start_time`,`end_time`);

--
-- Indexes for table `tutor_profiles`
--
ALTER TABLE `tutor_profiles`
  ADD PRIMARY KEY (`tutor_id`);

--
-- Indexes for table `tutor_subjects`
--
ALTER TABLE `tutor_subjects`
  ADD PRIMARY KEY (`offering_id`),
  ADD UNIQUE KEY `uq_tutor_subject` (`tutor_id`,`subject_id`),
  ADD KEY `fk_offering_subject` (`subject_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`session_hash`),
  ADD KEY `idx_session_user` (`user_id`),
  ADD KEY `idx_session_expiry` (`expires_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_payments`
--
ALTER TABLE `booking_payments`
  MODIFY `payment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_payment_history`
--
ALTER TABLE `booking_payment_history`
  MODIFY `payment_history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `booking_revenue_splits`
--
ALTER TABLE `booking_revenue_splits`
  MODIFY `split_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_status_history`
--
ALTER TABLE `booking_status_history`
  MODIFY `history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `demo_earnings_ledger`
--
ALTER TABLE `demo_earnings_ledger`
  MODIFY `ledger_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `demo_payment_attempts`
--
ALTER TABLE `demo_payment_attempts`
  MODIFY `attempt_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `demo_payment_receipts`
--
ALTER TABLE `demo_payment_receipts`
  MODIFY `receipt_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `demo_tutor_withdrawals`
--
ALTER TABLE `demo_tutor_withdrawals`
  MODIFY `withdrawal_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `tutor_availability`
--
ALTER TABLE `tutor_availability`
  MODIFY `availability_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tutor_subjects`
--
ALTER TABLE `tutor_subjects`
  MODIFY `offering_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_booking_offering` FOREIGN KEY (`offering_id`) REFERENCES `tutor_subjects` (`offering_id`),
  ADD CONSTRAINT `fk_booking_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `booking_payments`
--
ALTER TABLE `booking_payments`
  ADD CONSTRAINT `fk_booking_payment_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  ADD CONSTRAINT `fk_booking_payment_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `booking_payment_history`
--
ALTER TABLE `booking_payment_history`
  ADD CONSTRAINT `fk_payment_history_payment` FOREIGN KEY (`payment_id`) REFERENCES `booking_payments` (`payment_id`),
  ADD CONSTRAINT `fk_payment_history_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `booking_revenue_splits`
--
ALTER TABLE `booking_revenue_splits`
  ADD CONSTRAINT `fk_split_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`);

--
-- Constraints for table `booking_status_history`
--
ALTER TABLE `booking_status_history`
  ADD CONSTRAINT `fk_booking_history_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  ADD CONSTRAINT `fk_booking_history_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `demo_earnings_ledger`
--
ALTER TABLE `demo_earnings_ledger`
  ADD CONSTRAINT `fk_demo_earning_receipt` FOREIGN KEY (`receipt_id`) REFERENCES `demo_payment_receipts` (`receipt_id`),
  ADD CONSTRAINT `fk_demo_earning_user` FOREIGN KEY (`beneficiary_user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `demo_payment_attempts`
--
ALTER TABLE `demo_payment_attempts`
  ADD CONSTRAINT `fk_demo_attempt_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  ADD CONSTRAINT `fk_demo_attempt_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `demo_payment_receipts`
--
ALTER TABLE `demo_payment_receipts`
  ADD CONSTRAINT `fk_demo_receipt_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `demo_payment_attempts` (`attempt_id`),
  ADD CONSTRAINT `fk_demo_receipt_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
  ADD CONSTRAINT `fk_demo_receipt_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_demo_receipt_tutor` FOREIGN KEY (`tutor_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `demo_tutor_withdrawals`
--
ALTER TABLE `demo_tutor_withdrawals`
  ADD CONSTRAINT `fk_demo_withdrawals_user` FOREIGN KEY (`tutor_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `transaction_ticket_state`
--
ALTER TABLE `transaction_ticket_state`
  ADD CONSTRAINT `fk_ticket_payment` FOREIGN KEY (`payment_id`) REFERENCES `booking_payments` (`payment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ticket_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tutor_availability`
--
ALTER TABLE `tutor_availability`
  ADD CONSTRAINT `fk_availability_tutor` FOREIGN KEY (`tutor_id`) REFERENCES `tutor_profiles` (`tutor_id`) ON DELETE CASCADE;

--
-- Constraints for table `tutor_profiles`
--
ALTER TABLE `tutor_profiles`
  ADD CONSTRAINT `fk_tutor_profiles_users` FOREIGN KEY (`tutor_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `tutor_subjects`
--
ALTER TABLE `tutor_subjects`
  ADD CONSTRAINT `fk_offering_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`),
  ADD CONSTRAINT `fk_offering_tutor` FOREIGN KEY (`tutor_id`) REFERENCES `tutor_profiles` (`tutor_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
