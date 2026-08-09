CREATE TABLE complaint (
    id VARCHAR(50) PRIMARY KEY,               -- e.g. CMP-00001
    title VARCHAR(255) NOT NULL,

    -- Nature classification
    nature_id INT NOT NULL,
    nature_type_id INT NOT NULL,

    picture VARCHAR(255),                     -- assets/complaints/filename.ext
    description TEXT NOT NULL,

    -- Location (room → floor → building → colony)
    room_id INT UNSIGNED NULL,

    -- Priority (nullable)
    priority_id INT NULL,

    -- People involved
    customer_id VARCHAR(100) NOT NULL,
    staff_id VARCHAR(50) NULL,                -- Assigned staff
    receiver_id VARCHAR(50) NULL,             -- Staff who received complaint

    status ENUM(
        'Pending',
        'In Progress',
        'On Hold',
        'Completed',
        'Rejected',
        'Cancelled'
    ) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- =========================
    -- Foreign Key Constraints
    -- =========================

    CONSTRAINT fk_complaint_nature
        FOREIGN KEY (nature_id)
        REFERENCES Natures(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_complaint_nature_type
        FOREIGN KEY (nature_type_id)
        REFERENCES NatureTypes(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_complaint_room
        FOREIGN KEY (room_id)
        REFERENCES room(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_complaint_priority
        FOREIGN KEY (priority_id)
        REFERENCES Priority(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_complaint_customer
        FOREIGN KEY (customer_id)
        REFERENCES Customer(customer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_complaint_staff
        FOREIGN KEY (staff_id)
        REFERENCES Staff(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_complaint_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES Staff(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE complaint
ADD COLUMN completed_at DATETIME NULL;

ALTER TABLE complaintreciever
ADD COLUMN phone_number VARCHAR(15) NULL;


CREATE TABLE complaint_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,

    complaint_id VARCHAR(50) NOT NULL,

    previous_status ENUM(
        'Pending',
        'In Progress',
        'On Hold',
        'Completed',
        'Rejected',
        'Cancelled'
    ) NOT NULL,

    new_status ENUM(
        'Pending',
        'In Progress',
        'On Hold',
        'Completed',
        'Rejected',
        'Cancelled'
    ) NOT NULL,

    changed_by_receiver_id VARCHAR(50) NOT NULL,

    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- =========================
    -- Foreign Keys
    -- =========================

    CONSTRAINT fk_status_history_complaint
        FOREIGN KEY (complaint_id)
        REFERENCES complaint(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_status_history_receiver
        FOREIGN KEY (changed_by_receiver_id)
        REFERENCES ComplaintReceiver(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;




-- Drop the existing foreign key constraint
ALTER TABLE complaint DROP FOREIGN KEY fk_complaint_receiver;

-- Add new constraint referencing ComplaintReceiver table
ALTER TABLE complaint 
ADD CONSTRAINT fk_complaint_receiver 
FOREIGN KEY (receiver_id) 
REFERENCES ComplaintReceiver(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

CREATE TABLE staff_assignment_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id VARCHAR(50) NOT NULL,
    changed_by_receiver_id VARCHAR(50) NOT NULL,
    previous_staff_id VARCHAR(50) NULL,
    new_staff_id VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_sal_complaint FOREIGN KEY (complaint_id) REFERENCES complaint(id),
    CONSTRAINT fk_sal_receiver FOREIGN KEY (changed_by_receiver_id) REFERENCES ComplaintReceiver(id),
    CONSTRAINT fk_sal_prev_staff FOREIGN KEY (previous_staff_id) REFERENCES Staff(id),
    CONSTRAINT fk_sal_new_staff FOREIGN KEY (new_staff_id) REFERENCES Staff(id)
);