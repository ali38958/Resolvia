
-- Create Customer table with VARCHAR customer_id
CREATE TABLE Customer (
    customer_id VARCHAR(100) PRIMARY KEY,  -- User ID (not auto-increment)
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    picture VARCHAR(255),                 -- Path to picture: assets/customers/filename.ext
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_customer_id (customer_id)
);

ALTER TABLE customer
ADD COLUMN status ENUM('Active', 'Disabled') NOT NULL DEFAULT 'Active';
