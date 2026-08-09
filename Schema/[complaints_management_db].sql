Table Admin {
  id varchar(50) [pk]
  name varchar(100) [not null]
  email varchar(150) [not null, unique]
  password_hash varchar(255) [not null]
  picture varchar(255)
  is_superadmin boolean [default: false]
  status enum('Active','Inactive') [default: 'Active']
  created_at timestamp
  updated_at timestamp
}

Table ComplaintReceiver {
  id varchar(50) [pk]
  name varchar(100) [not null]
  email varchar(150) [not null, unique]
  password_hash varchar(255) [not null]
  picture varchar(255)
  status enum('Active','Inactive') [default: 'Active']
  created_at timestamp
  updated_at timestamp
}

Table Customer {
  customer_id varchar(100) [pk]
  name varchar(100) [not null]
  email varchar(150) [not null, unique]
  phone_number varchar(20)
  password_hash varchar(255) [not null]
  picture varchar(255)
  status enum('Active','Disabled') [default: 'Active']
  created_at timestamp
  updated_at timestamp
}

Table Designation {
  id int [pk, increment]
  name varchar(100) [unique, not null]
  created_at timestamp
  updated_at timestamp
}

Table Staff {
  id varchar(50) [pk]
  name varchar(100) [not null]
  picture varchar(255)
  phone varchar(20)
  email varchar(100) [unique]
  designation_id int
  status enum('Active','Inactive','Suspended','Retired') [default: 'Active']
  password_hash varchar(255) [not null]
  created_at timestamp
  updated_at timestamp
}

Table colony {
  id int [pk, increment]
  name varchar(100) [not null]
}

Table building {
  id int [pk, increment]
  name varchar(100) [not null]
  picture varchar(255)
  built_year varchar(10)
  colony_id int [not null]
}

Table floor {
  id int [pk, increment]
  floor_name varchar(50) [not null]
  picture varchar(255)
  building_id int [not null]
}

Table room_type {
  id int [pk, increment]
  name varchar(50) [not null]
}

Table room {
  id int [pk, increment]
  room_label varchar(100) [not null]
  floor_id int [not null]
  room_type_id int [not null]

  Indexes {
    (floor_id, room_label) [unique]
  }
}

Table Natures {
  id int [pk, increment]
  name varchar(100) [unique, not null]
  created_at timestamp
  updated_at timestamp
}

Table NatureTypes {
  id int [pk, increment]
  nature_id int [not null]
  type_name varchar(100) [not null]
  created_at timestamp
  updated_at timestamp
}

Table Priority {
  id int [pk, increment]
  name varchar(255) [not null]
  value int
  created_at timestamp
  updated_at timestamp
}

Table complaint {
  id varchar(50) [pk]
  title varchar(255) [not null]
  nature_id int [not null]
  nature_type_id int [not null]
  picture varchar(255)
  description text [not null]
  room_id int
  priority_id int
  customer_id varchar(100) [not null]
  staff_id varchar(50)
  receiver_id varchar(50)
  status enum('Pending','In Progress','On Hold','Completed','Rejected','Cancelled') [default: 'Pending']
  completed_at datetime
  created_at timestamp
  updated_at timestamp
}

Table complaint_status_history {
  id int [pk, increment]
  complaint_id varchar(50) [not null]
  previous_status enum('Pending','In Progress','On Hold','Completed','Rejected','Cancelled') [not null]
  new_status enum('Pending','In Progress','On Hold','Completed','Rejected','Cancelled') [not null]
  changed_by_receiver_id varchar(50) [not null]
  changed_at timestamp
}

Table found_items {
  id bigint [pk, increment]
  title varchar(255) [not null]
  category varchar(100) [not null]
  date_found date [not null]
  description text
  location varchar(500)
  city varchar(100)
  postal_code varchar(20)
  state_province varchar(100)
  country varchar(100)
  latitude decimal(9,6)
  longitude decimal(9,6)
  is_visible boolean [default: false]
  status enum('Pending','Collected','Returned','Unavailable') [default: 'Pending']
  customer_id varchar(100) [not null]
}

Table found_item_pictures {
  id bigint [pk, increment]
  found_item_id bigint [not null]
  picture varchar(255) [not null]
  uploaded_at timestamp
}

Table found_item_claims {
  id bigint [pk, increment]
  found_item_id bigint [not null]
  customer_id varchar(100) [not null]
  claim_date timestamp
  status enum('pending','approved','rejected') [default: 'pending']

  Indexes {
    (found_item_id, customer_id) [unique]
  }
}

Table email_otp {
  otp_id int [pk, increment]
  email varchar(150) [not null]
  otp_hash varchar(255) [not null]
  purpose enum('signup','email_change','password_reset') [not null]
  attempts_today tinyint
  last_sent_at datetime [not null]
  expires_at datetime [not null]
  created_at timestamp
}

Ref: building.colony_id > colony.id
Ref: floor.building_id > building.id
Ref: room.floor_id > floor.id
Ref: room.room_type_id > room_type.id
Ref: NatureTypes.nature_id > Natures.id
Ref: complaint.nature_id > Natures.id
Ref: complaint.nature_type_id > NatureTypes.id
Ref: complaint.room_id > room.id
Ref: complaint.priority_id > Priority.id
Ref: complaint.customer_id > Customer.customer_id
Ref: complaint.staff_id > Staff.id
Ref: complaint.receiver_id > ComplaintReceiver.id
Ref: complaint_status_history.complaint_id > complaint.id
Ref: complaint_status_history.changed_by_receiver_id > ComplaintReceiver.id
Ref: found_items.customer_id > Customer.customer_id
Ref: found_item_pictures.found_item_id > found_items.id
Ref: found_item_claims.found_item_id > found_items.id
Ref: found_item_claims.customer_id > Customer.customer_id
Ref: Staff.designation_id > Designation.id
