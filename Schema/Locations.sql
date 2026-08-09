CREATE TABLE colony (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE building (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    picture VARCHAR(255),
    built_year VARCHAR(10),
    colony_id INT UNSIGNED NOT NULL,

    CONSTRAINT fk_building_colony
        FOREIGN KEY (colony_id)
        REFERENCES colony(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


CREATE TABLE room_type (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
) ENGINE=InnoDB;


CREATE TABLE floor (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    floor_name VARCHAR(50) NOT NULL,
    picture VARCHAR(255),
    building_id INT UNSIGNED NOT NULL,

    CONSTRAINT fk_floor_building
        FOREIGN KEY (building_id)
        REFERENCES building(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;



CREATE TABLE room (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    room_label VARCHAR(100) NOT NULL,
    floor_id INT UNSIGNED NOT NULL,
    room_type_id INT UNSIGNED NOT NULL,

    CONSTRAINT fk_room_floor
        FOREIGN KEY (floor_id)
        REFERENCES floor(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_room_type
        FOREIGN KEY (room_type_id)
        REFERENCES room_type(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    UNIQUE KEY uq_room_floor_label (floor_id, room_label)
) ENGINE=InnoDB;


