DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  item VARCHAR(100),
  qty INT,
  address TEXT,
  seller VARCHAR(100) DEFAULT 'Flipkart'
);


CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  item VARCHAR(100),
  qty INT,
  address TEXT,
  seller VARCHAR(100) DEFAULT 'Flipkart'
);

