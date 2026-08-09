CREATE TABLE found_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    date_found DATE NOT NULL,
    description TEXT,
    location VARCHAR(500),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    state_province VARCHAR(100),
    country VARCHAR(100),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    is_visible BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM(
        'Pending',
        'Collected',
        'Returned',
        'Unavailable'
    ) NOT NULL DEFAULT 'Pending',
    customer_id VARCHAR(100) NOT NULL,
    CONSTRAINT fk_found_items_customer
        FOREIGN KEY (customer_id)
        REFERENCES Customer(customer_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE found_item_pictures (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    found_item_id BIGINT NOT NULL,
    picture VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_found_item_pictures
        FOREIGN KEY (found_item_id)
        REFERENCES found_items(id)
        ON DELETE CASCADE
);

CREATE TABLE found_item_claims (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    found_item_id BIGINT NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',

    CONSTRAINT fk_found_item_claims_item
        FOREIGN KEY (found_item_id)
        REFERENCES found_items(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_found_item_claims_customer
        FOREIGN KEY (customer_id)
        REFERENCES Customer(customer_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_customer_item_claim
        UNIQUE (found_item_id, customer_id)
);

