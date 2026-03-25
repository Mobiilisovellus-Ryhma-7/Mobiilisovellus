/* Auto-generated schema for Data Connect */
/* Inferred from GetHealthCheck and ListAllFacilities operations */

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY,
  status VARCHAR(50),
  bookingTime TIMESTAMP,
  userId UUID,
  facilityId UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  address VARCHAR(255),
  typeId UUID,
  description TEXT,
  openingHours VARCHAR(255),
  contactNumber VARCHAR(20),
  imageUrl VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facility_types (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
