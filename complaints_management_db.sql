-- phpMyAdmin SQL Dump
-- version 5.0.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 26, 2026 at 04:25 PM
-- Server version: 10.4.11-MariaDB
-- PHP Version: 7.4.2

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `complaints_management_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `picture` varchar(255) DEFAULT NULL,
  `is_superadmin` tinyint(1) DEFAULT 0,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `name`, `email`, `password_hash`, `picture`, `is_superadmin`, `status`, `created_at`, `updated_at`) VALUES
('admin001', 'Sakazuki', 'akainu@op.com', '$2b$10$94O//9XIxI83IZs1ipETEed2uwMzXh5tA0UXQP/P2cgOcGY/rt5La', '/assets/admins/admin-1770299470503-366246113.jpeg', 0, 'Active', '2026-02-05 13:50:59', '2026-02-25 15:51:35'),
('knight', 'The Hollow', 'root.admin@resolvia.com', '$2b$10$/wjkUe6UQsoIUZC6NWtmVuF8nSaMn5NLTe0kUwXomLkAE6WOS07lq', '/assets/admins/admin-1770299189300-589034978.jpeg', 1, 'Active', '2026-02-05 13:46:29', '2026-02-25 17:56:27');

-- --------------------------------------------------------

--
-- Table structure for table `building`
--

CREATE TABLE `building` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `picture` varchar(255) DEFAULT NULL,
  `built_year` varchar(10) DEFAULT NULL,
  `colony_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `building`
--

INSERT INTO `building` (`id`, `name`, `picture`, `built_year`, `colony_id`) VALUES
(1, 'Academic Block', NULL, '2018', 1),
(2, 'Lab Block', NULL, '2020', 1);

-- --------------------------------------------------------

--
-- Table structure for table `colony`
--

CREATE TABLE `colony` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `colony`
--

INSERT INTO `colony` (`id`, `name`) VALUES
(1, 'Nutech University');

-- --------------------------------------------------------

--
-- Table structure for table `complaint`
--

CREATE TABLE `complaint` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `nature_id` int(11) NOT NULL,
  `nature_type_id` int(11) NOT NULL,
  `picture` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `room_id` int(10) UNSIGNED DEFAULT NULL,
  `priority_id` int(11) DEFAULT NULL,
  `customer_id` varchar(100) NOT NULL,
  `staff_id` varchar(50) DEFAULT NULL,
  `receiver_id` varchar(50) DEFAULT NULL,
  `status` enum('Pending','In Progress','On Hold','Completed','Rejected','Cancelled') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `complaint`
--

INSERT INTO `complaint` (`id`, `title`, `nature_id`, `nature_type_id`, `picture`, `description`, `room_id`, `priority_id`, `customer_id`, `staff_id`, `receiver_id`, `status`, `created_at`, `updated_at`, `completed_at`) VALUES
('CP0226--1', 'Dafa hou', 1, 1, NULL, 'Gum gaya hai', 13, NULL, 'srk', 'st001', 'ch001', 'On Hold', '2026-02-26 06:17:28', '2026-02-26 06:37:49', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `complaintreceiver`
--

CREATE TABLE `complaintreceiver` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `picture` varchar(255) DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `phone_number` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `complaintreceiver`
--

INSERT INTO `complaintreceiver` (`id`, `name`, `email`, `password_hash`, `picture`, `status`, `created_at`, `updated_at`, `phone_number`) VALUES
('ch001', 'Faiz Ahmed', 'ch.001@resolvia.com', '$2b$10$XFeuXMdonCAPZ/ij12Dy/eXMpx7QbWNVF3/T/UmK87UClpHKcii8e', '/assets/cmanager/cmanager-1772088485761-192465335.png', 'Active', '2026-02-25 18:46:13', '2026-02-26 06:48:05', '+123 456 789');

-- --------------------------------------------------------

--
-- Table structure for table `complaint_logs`
--

CREATE TABLE `complaint_logs` (
  `id` int(11) NOT NULL,
  `complaint_id` varchar(50) NOT NULL,
  `action` varchar(100) NOT NULL,
  `performed_by` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `complaint_logs`
--

INSERT INTO `complaint_logs` (`id`, `complaint_id`, `action`, `performed_by`, `details`, `created_at`) VALUES
(1, 'CP0226--1', 'Created', 'srk', '{\"title\":\"Dafa hou\",\"nature\":\"Lost item\",\"nature_type\":\"phone\",\"status\":\"Pending\"}', '2026-02-26 06:17:28');

-- --------------------------------------------------------

--
-- Table structure for table `complaint_status_history`
--

CREATE TABLE `complaint_status_history` (
  `id` int(11) NOT NULL,
  `complaint_id` varchar(50) NOT NULL,
  `previous_status` enum('Pending','In Progress','On Hold','Completed','Rejected','Cancelled') NOT NULL,
  `new_status` enum('Pending','In Progress','On Hold','Completed','Rejected','Cancelled') NOT NULL,
  `changed_by_receiver_id` varchar(50) NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `complaint_status_history`
--

INSERT INTO `complaint_status_history` (`id`, `complaint_id`, `previous_status`, `new_status`, `changed_by_receiver_id`, `changed_at`) VALUES
(1, 'CP0226--1', 'Pending', 'On Hold', 'ch001', '2026-02-26 06:18:58');

-- --------------------------------------------------------

--
-- Table structure for table `customer`
--

CREATE TABLE `customer` (
  `customer_id` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `picture` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('Active','Disabled') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `customer`
--

INSERT INTO `customer` (`customer_id`, `name`, `email`, `phone_number`, `password_hash`, `picture`, `created_at`, `updated_at`, `status`) VALUES
('mak', 'maryam', 'agent272005@gmail.com', NULL, '$2b$10$TIsxaV5RHo6i0WOoCLJL/ugKbMRB18EsuzkQdVCZ1ZMe54Ds/4IGK', '/assets/customers/default.png', '2026-02-26 06:11:38', '2026-02-26 06:11:38', 'Active'),
('srk', 'Kamado Tanjiro', 'f24605008@nutech.edu.pk', NULL, '$2b$10$Z0V3m7cmGy7FviZ6.F3cheRup1fZYeqMMVv.pO31soNftHUZHXe4G', '/assets/customers/default.png', '2026-02-26 06:12:22', '2026-02-26 06:12:22', 'Active'),
('u101', 'user101', 'fariahhajra@gmail.com', NULL, '$2b$10$gn7Mn4vKhnPFSCJr.zzByeM10Lfca7H/HuQrzxjrFKmI8p5kmDan.', '/assets/customers/default.png', '2026-02-26 06:34:47', '2026-02-26 06:36:34', 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `designation`
--

CREATE TABLE `designation` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `designation`
--

INSERT INTO `designation` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Lab Assistant', '2026-02-25 18:43:19', '2026-02-25 18:43:19'),
(2, 'Worker', '2026-02-25 18:46:42', '2026-02-25 18:46:42');

-- --------------------------------------------------------

--
-- Table structure for table `email_otp`
--

CREATE TABLE `email_otp` (
  `otp_id` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `otp_hash` varchar(255) NOT NULL,
  `purpose` enum('signup','email_change','password_reset') NOT NULL,
  `attempts_today` tinyint(4) DEFAULT 0,
  `last_sent_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `floor`
--

CREATE TABLE `floor` (
  `id` int(10) UNSIGNED NOT NULL,
  `floor_name` varchar(50) NOT NULL,
  `picture` varchar(255) DEFAULT NULL,
  `building_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `floor`
--

INSERT INTO `floor` (`id`, `floor_name`, `picture`, `building_id`) VALUES
(1, 'Level 1', '/assets/floors/1772043755809-58nvnxrvqaa.png', 1),
(2, 'Level 2', '/assets/floors/1772043809707-wdvj6caceee.png', 1),
(3, 'Level 3', '/assets/floors/1772043866356-sa98f7evx6.png', 1),
(4, 'Level 4', '/assets/floors/1772043871443-jxqogwnrbn.png', 1),
(5, 'Level 5', NULL, 1),
(6, 'Level 6', '/assets/floors/1772043877114-jh5c1sb3v4.png', 1),
(7, 'Level 7', '/assets/floors/1772043884677-x95oi4tv9vh.png', 1),
(8, 'Level 8', '/assets/floors/1772043890075-ni6ffmn87sg.png', 1);

-- --------------------------------------------------------

--
-- Table structure for table `found_items`
--

CREATE TABLE `found_items` (
  `id` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `date_found` date NOT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(500) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `state_province` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `latitude` decimal(9,6) DEFAULT NULL,
  `longitude` decimal(9,6) DEFAULT NULL,
  `is_visible` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('Pending','Collected','Returned','Unavailable') NOT NULL DEFAULT 'Pending',
  `customer_id` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `found_items`
--

INSERT INTO `found_items` (`id`, `title`, `category`, `date_found`, `description`, `location`, `city`, `postal_code`, `state_province`, `country`, `latitude`, `longitude`, `is_visible`, `status`, `customer_id`) VALUES
(1, 'phone', 'electronics', '2026-02-26', 'jasavjsgjqwshsvjsahshgavghsasshvshss', 'ایچ-12, Islamabad, Zone 1, Islamabad Capital Territory, 44000, Pakistan (ground)', 'Islamabad', '44000', 'Islamabad Capital Territory', 'Pakistan', '33.630933', '73.004460', 0, 'Collected', 'mak'),
(2, 'gsjcvazs', 'electronics', '2026-02-26', 'savssavdbvsabvd', 'National University Of Technology (NUTECH), IJP Road, Islamabad, Zone 1, Rawalpindi District, Rawalpindi Division, Islamabad Capital Territory, 44000, Pakistan (sdsmddsavcvahvc)', 'Islamabad', '44000', 'Islamabad Capital Territory', 'Pakistan', '33.630652', '73.006908', 1, 'Returned', 'mak'),
(3, 'bag', 'bags', '2026-01-27', 'qwertyuiop', 'ayub park, Grand Trunk Road, Askari 10, Rawalpindi Cantonment, Chaklala Cantonment, Rawalpindi District, Rawalpindi Division, Punjab, 46600, Pakistan (Additional Location Details)', 'Rawalpindi Cantonment', '46600', 'Punjab', 'Pakistan', NULL, NULL, 0, 'Pending', 'u101');

-- --------------------------------------------------------

--
-- Table structure for table `found_item_claims`
--

CREATE TABLE `found_item_claims` (
  `id` bigint(20) NOT NULL,
  `found_item_id` bigint(20) NOT NULL,
  `customer_id` varchar(100) NOT NULL,
  `claim_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `found_item_claims`
--

INSERT INTO `found_item_claims` (`id`, `found_item_id`, `customer_id`, `claim_date`, `status`) VALUES
(1, 2, 'srk', '2026-02-26 06:35:34', 'approved');

-- --------------------------------------------------------

--
-- Table structure for table `found_item_pictures`
--

CREATE TABLE `found_item_pictures` (
  `id` bigint(20) NOT NULL,
  `found_item_id` bigint(20) NOT NULL,
  `picture` varchar(255) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `found_item_pictures`
--

INSERT INTO `found_item_pictures` (`id`, `found_item_id`, `picture`, `uploaded_at`) VALUES
(1, 2, '/assets/found/1772087419216-9xs1ldbys6.png', '2026-02-26 06:30:19'),
(2, 2, '/assets/found/1772087419221-o7l23zajyv.png', '2026-02-26 06:30:19'),
(3, 2, '/assets/found/1772087419236-ywtxylw3n97.png', '2026-02-26 06:30:19'),
(4, 3, '/assets/found/1772088140295-qdoiuep7cq.png', '2026-02-26 06:42:20');

-- --------------------------------------------------------

--
-- Table structure for table `natures`
--

CREATE TABLE `natures` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `natures`
--

INSERT INTO `natures` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Lost item', '2026-02-26 06:13:16', '2026-02-26 06:13:16'),
(2, 'Sanitary', '2026-02-26 06:14:48', '2026-02-26 06:14:48'),
(3, 'PC ISSUE', '2026-02-26 06:14:55', '2026-02-26 06:14:55'),
(4, 'OTHER', '2026-02-26 06:15:49', '2026-02-26 06:15:49');

-- --------------------------------------------------------

--
-- Table structure for table `naturetypes`
--

CREATE TABLE `naturetypes` (
  `id` int(11) NOT NULL,
  `nature_id` int(11) NOT NULL,
  `type_name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `naturetypes`
--

INSERT INTO `naturetypes` (`id`, `nature_id`, `type_name`, `created_at`, `updated_at`) VALUES
(1, 1, 'phone', '2026-02-26 06:13:16', '2026-02-26 06:13:16'),
(2, 2, 'empty', '2026-02-26 06:14:48', '2026-02-26 06:14:48'),
(3, 2, 'pipe blocked', '2026-02-26 06:14:48', '2026-02-26 06:14:48'),
(4, 2, 'broken', '2026-02-26 06:14:48', '2026-02-26 06:14:48'),
(5, 2, 'unclean', '2026-02-26 06:14:48', '2026-02-26 06:14:48'),
(6, 2, 'unclean water', '2026-02-26 06:14:48', '2026-02-26 06:14:48'),
(7, 3, 'USB PORT ISSUE', '2026-02-26 06:14:55', '2026-02-26 06:14:55'),
(8, 4, 'OTHER', '2026-02-26 06:15:49', '2026-02-26 06:15:49');

-- --------------------------------------------------------

--
-- Table structure for table `priority`
--

CREATE TABLE `priority` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `value` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `priority`
--

INSERT INTO `priority` (`id`, `name`, `value`, `created_at`, `updated_at`) VALUES
(1, 'Immediate', 4, '2026-02-01 05:37:15', '2026-02-01 05:49:05'),
(3, 'Routine', 24, '2026-02-01 05:37:15', '2026-02-01 05:52:58'),
(4, 'Urgent', 6, '2026-02-01 05:37:15', '2026-02-01 05:48:15'),
(6, 'Default', NULL, '2026-02-06 16:16:35', '2026-02-06 16:16:35');

-- --------------------------------------------------------

--
-- Table structure for table `room`
--

CREATE TABLE `room` (
  `id` int(10) UNSIGNED NOT NULL,
  `room_label` varchar(100) NOT NULL,
  `floor_id` int(10) UNSIGNED NOT NULL,
  `room_type_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `room`
--

INSERT INTO `room` (`id`, `room_label`, `floor_id`, `room_type_id`) VALUES
(1, 'Electric Lab - 1', 1, 1),
(2, 'Electric Lab - 2', 1, 1),
(3, 'Civil Lab - 1', 1, 1),
(4, 'Civil Lab - 2', 1, 1),
(5, 'Fluid Mech Lab', 1, 1),
(6, 'Controls and Instrumentation Lab', 1, 1),
(7, 'Heat Tfr. Lab', 1, 1),
(8, 'NEIC Hall no. 1', 1, 6),
(9, 'NEIC Staff', 1, 4),
(10, 'Staff Restrooms', 1, 3),
(11, 'NEIC Hall no. 2', 1, 6),
(12, 'Restroom (Boys)', 2, 3),
(13, 'Cafeteria', 2, 7),
(14, 'Kitchen', 2, 8),
(15, 'AC201', 2, 2),
(16, 'AC202', 2, 2),
(17, 'AC203', 2, 2),
(18, 'AC204', 2, 2),
(19, 'New Room (Girls)', 2, 7),
(20, 'New Room', 3, 7);

-- --------------------------------------------------------

--
-- Table structure for table `room_type`
--

CREATE TABLE `room_type` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `room_type`
--

INSERT INTO `room_type` (`id`, `name`) VALUES
(1, 'Lab'),
(2, 'Classroom'),
(3, 'Washroom'),
(4, 'Office'),
(5, 'Lift'),
(6, 'Hall'),
(7, 'Cafeteria'),
(8, 'Kitchen');

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `picture` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `designation_id` int(11) DEFAULT NULL,
  `status` enum('Active','Inactive','Suspended','Retired') DEFAULT 'Active',
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`id`, `name`, `picture`, `phone`, `email`, `designation_id`, `status`, `password_hash`, `created_at`, `updated_at`) VALUES
('st001', 'Asif Kamaal', NULL, '+987 654 321', 'st.001@resolvia.com', 2, 'Active', '$2b$10$zJJub8uvs5jJ8Ea0ZK1NOuJdinmPfZx0DyRoleBhINWGGuxxx.6qy', '2026-02-25 18:48:11', '2026-02-26 01:27:10');

-- --------------------------------------------------------

--
-- Table structure for table `staff_assignment_logs`
--

CREATE TABLE `staff_assignment_logs` (
  `id` int(11) NOT NULL,
  `complaint_id` varchar(50) NOT NULL,
  `changed_by_receiver_id` varchar(50) NOT NULL,
  `previous_staff_id` varchar(50) DEFAULT NULL,
  `new_staff_id` varchar(50) NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `staff_assignment_logs`
--

INSERT INTO `staff_assignment_logs` (`id`, `complaint_id`, `changed_by_receiver_id`, `previous_staff_id`, `new_staff_id`, `changed_at`) VALUES
(1, 'CP0226--1', 'ch001', NULL, 'st001', '2026-02-26 06:37:49');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `building`
--
ALTER TABLE `building`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_building_colony` (`colony_id`);

--
-- Indexes for table `colony`
--
ALTER TABLE `colony`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `complaint`
--
ALTER TABLE `complaint`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_complaint_nature` (`nature_id`),
  ADD KEY `fk_complaint_nature_type` (`nature_type_id`),
  ADD KEY `fk_complaint_room` (`room_id`),
  ADD KEY `fk_complaint_priority` (`priority_id`),
  ADD KEY `fk_complaint_customer` (`customer_id`),
  ADD KEY `fk_complaint_staff` (`staff_id`),
  ADD KEY `fk_complaint_receiver` (`receiver_id`);

--
-- Indexes for table `complaintreceiver`
--
ALTER TABLE `complaintreceiver`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `complaint_logs`
--
ALTER TABLE `complaint_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_complaint_id` (`complaint_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `complaint_status_history`
--
ALTER TABLE `complaint_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_status_history_complaint` (`complaint_id`),
  ADD KEY `fk_status_history_receiver` (`changed_by_receiver_id`);

--
-- Indexes for table `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_customer_id` (`customer_id`);

--
-- Indexes for table `designation`
--
ALTER TABLE `designation`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `email_otp`
--
ALTER TABLE `email_otp`
  ADD PRIMARY KEY (`otp_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_expires` (`expires_at`);

--
-- Indexes for table `floor`
--
ALTER TABLE `floor`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_floor_building` (`building_id`);

--
-- Indexes for table `found_items`
--
ALTER TABLE `found_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_found_items_customer` (`customer_id`);

--
-- Indexes for table `found_item_claims`
--
ALTER TABLE `found_item_claims`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_customer_item_claim` (`found_item_id`,`customer_id`),
  ADD KEY `fk_found_item_claims_customer` (`customer_id`);

--
-- Indexes for table `found_item_pictures`
--
ALTER TABLE `found_item_pictures`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_found_item_pictures` (`found_item_id`);

--
-- Indexes for table `natures`
--
ALTER TABLE `natures`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `naturetypes`
--
ALTER TABLE `naturetypes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `nature_id` (`nature_id`);

--
-- Indexes for table `priority`
--
ALTER TABLE `priority`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `room`
--
ALTER TABLE `room`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_room_floor_label` (`floor_id`,`room_label`),
  ADD KEY `fk_room_type` (`room_type_id`);

--
-- Indexes for table `room_type`
--
ALTER TABLE `room_type`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `designation_id` (`designation_id`);

--
-- Indexes for table `staff_assignment_logs`
--
ALTER TABLE `staff_assignment_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sal_complaint` (`complaint_id`),
  ADD KEY `fk_sal_receiver` (`changed_by_receiver_id`),
  ADD KEY `fk_sal_prev_staff` (`previous_staff_id`),
  ADD KEY `fk_sal_new_staff` (`new_staff_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `building`
--
ALTER TABLE `building`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `colony`
--
ALTER TABLE `colony`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `complaint_logs`
--
ALTER TABLE `complaint_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `complaint_status_history`
--
ALTER TABLE `complaint_status_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `designation`
--
ALTER TABLE `designation`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `email_otp`
--
ALTER TABLE `email_otp`
  MODIFY `otp_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `floor`
--
ALTER TABLE `floor`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `found_items`
--
ALTER TABLE `found_items`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `found_item_claims`
--
ALTER TABLE `found_item_claims`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `found_item_pictures`
--
ALTER TABLE `found_item_pictures`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `natures`
--
ALTER TABLE `natures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `naturetypes`
--
ALTER TABLE `naturetypes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `priority`
--
ALTER TABLE `priority`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `room`
--
ALTER TABLE `room`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `room_type`
--
ALTER TABLE `room_type`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `staff_assignment_logs`
--
ALTER TABLE `staff_assignment_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `building`
--
ALTER TABLE `building`
  ADD CONSTRAINT `fk_building_colony` FOREIGN KEY (`colony_id`) REFERENCES `colony` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `complaint`
--
ALTER TABLE `complaint`
  ADD CONSTRAINT `fk_complaint_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaint_nature` FOREIGN KEY (`nature_id`) REFERENCES `natures` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaint_nature_type` FOREIGN KEY (`nature_type_id`) REFERENCES `naturetypes` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaint_priority` FOREIGN KEY (`priority_id`) REFERENCES `priority` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaint_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `complaintreceiver` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaint_room` FOREIGN KEY (`room_id`) REFERENCES `room` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaint_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `complaint_logs`
--
ALTER TABLE `complaint_logs`
  ADD CONSTRAINT `fk_complaint_logs_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `complaint_status_history`
--
ALTER TABLE `complaint_status_history`
  ADD CONSTRAINT `fk_status_history_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_status_history_receiver` FOREIGN KEY (`changed_by_receiver_id`) REFERENCES `complaintreceiver` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `floor`
--
ALTER TABLE `floor`
  ADD CONSTRAINT `fk_floor_building` FOREIGN KEY (`building_id`) REFERENCES `building` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `found_items`
--
ALTER TABLE `found_items`
  ADD CONSTRAINT `fk_found_items_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON UPDATE CASCADE;

--
-- Constraints for table `found_item_claims`
--
ALTER TABLE `found_item_claims`
  ADD CONSTRAINT `fk_found_item_claims_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_found_item_claims_item` FOREIGN KEY (`found_item_id`) REFERENCES `found_items` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `found_item_pictures`
--
ALTER TABLE `found_item_pictures`
  ADD CONSTRAINT `fk_found_item_pictures` FOREIGN KEY (`found_item_id`) REFERENCES `found_items` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `naturetypes`
--
ALTER TABLE `naturetypes`
  ADD CONSTRAINT `naturetypes_ibfk_1` FOREIGN KEY (`nature_id`) REFERENCES `natures` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `room`
--
ALTER TABLE `room`
  ADD CONSTRAINT `fk_room_floor` FOREIGN KEY (`floor_id`) REFERENCES `floor` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_type` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `staff`
--
ALTER TABLE `staff`
  ADD CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`designation_id`) REFERENCES `designation` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `staff_assignment_logs`
--
ALTER TABLE `staff_assignment_logs`
  ADD CONSTRAINT `fk_sal_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaint` (`id`),
  ADD CONSTRAINT `fk_sal_new_staff` FOREIGN KEY (`new_staff_id`) REFERENCES `staff` (`id`),
  ADD CONSTRAINT `fk_sal_prev_staff` FOREIGN KEY (`previous_staff_id`) REFERENCES `staff` (`id`),
  ADD CONSTRAINT `fk_sal_receiver` FOREIGN KEY (`changed_by_receiver_id`) REFERENCES `complaintreceiver` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
