CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL
);

INSERT INTO categories (id, name_ar, name_en) VALUES
('real_estate', 'عقارات', 'Real Estate'),
('vehicles', 'مركبات', 'Vehicles'),
('services', 'خدمات', 'Services'),
('electronics', 'إلكترونيات', 'Electronics'),
('jobs', 'وظائف', 'Jobs')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    category_id VARCHAR(50) REFERENCES categories(id),
    country_code VARCHAR(10) NOT NULL,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    user_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
