-- Designation Table
CREATE TABLE Designation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Staff Table with user-provided ID (not auto-generated)
CREATE TABLE Staff (
    id VARCHAR(50) PRIMARY KEY,           -- User-provided ID (e.g., EMP001)
    name VARCHAR(100) NOT NULL,
    picture VARCHAR(255),                 -- Path to picture: assets/staff/filename.ext
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    designation_id INT,
    status ENUM('Active', 'Inactive', 'Suspended', 'Retired') DEFAULT 'Active',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (designation_id) REFERENCES Designation(id) ON DELETE SET NULL
);

-- Insert default designations
INSERT INTO Designation (name) VALUES 
('Manager'),
('Developer'),
('Analyst'),
('Designer'),
('HR Executive'),
('Accountant'),
('Supervisor'),
('Coordinator'),
('Director'),
('Engineer'),
('Consultant'),
('Recruiter');