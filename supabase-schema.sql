-- ============================================
-- Veloura Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(10, 2),
  sku TEXT UNIQUE,
  stock INTEGER DEFAULT 0,
  image TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  short_description TEXT,
  ingredients TEXT,
  benefits TEXT,
  usage TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  brand TEXT,
  skin_type TEXT,
  shades JSONB DEFAULT '[]'::jsonb,
  material TEXT,
  color TEXT,
  collection TEXT,
  size TEXT,
  finish TEXT,
  shape TEXT,
  length TEXT,
  badge TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Draft', 'Hidden')),
  rating NUMERIC(2, 1) DEFAULT 5.0,
  reviews INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  best_seller BOOLEAN DEFAULT FALSE,
  new_arrival BOOLEAN DEFAULT FALSE,
  trending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products(best_seller);
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products(new_arrival);
CREATE INDEX IF NOT EXISTS idx_products_trending ON products(trending);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  banner TEXT,
  subcategories JSONB DEFAULT '[]'::jsonb,
  featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(featured);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- ============================================
-- BANNERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS banners (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT NOT NULL UNIQUE CHECK (type IN ('newsBanner', 'promoBanner', 'heroSlides')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================
-- BLOG POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  cover_image TEXT,
  content TEXT,
  author TEXT DEFAULT 'Admin',
  publish_date TIMESTAMPTZ DEFAULT NOW(),
  category TEXT DEFAULT 'Beauty',
  tags JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft'))
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_publish_date ON blog_posts(publish_date DESC);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  author TEXT NOT NULL,
  initials TEXT,
  subtitle TEXT DEFAULT 'Verified Buyer',
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  product_name TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(date DESC);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id BIGINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEDIA LIBRARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS media_library (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'image',
  folder TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_library_folder ON media_library(folder);
CREATE INDEX IF NOT EXISTS idx_media_library_created_at ON media_library(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (for storefront)
CREATE POLICY "Public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Public read access" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON banners FOR SELECT USING (true);
CREATE POLICY "Public read access" ON blog_posts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public read access" ON settings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON media_library FOR SELECT USING (true);

-- Authenticated users can perform all operations (for admin)
CREATE POLICY "Authenticated users full access" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON banners FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON blog_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON media_library FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE banners;
ALTER PUBLICATION supabase_realtime ADD TABLE blog_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
ALTER PUBLICATION supabase_realtime ADD TABLE media_library;

-- ============================================
-- INITIAL DATA SEED
-- ============================================

-- Insert default settings if not exists
INSERT INTO settings (id, data)
VALUES (1, '{
  "siteName": "Veloura",
  "tagline": "Where Luxury Meets Beauty",
  "socialMedia": {
    "reddit": "https://www.reddit.com/r/veloura",
    "pinterest": "https://pinterest.com/veloura"
  },
  "contact": {
    "email": "hello@veloura.com",
    "phone": "+1 (555) 123-4567",
    "address": "123 Beauty Lane, Suite 100, Beverly Hills, CA 90210"
  },
  "seo": {
    "title": "Veloura - Premium Luxury Beauty Products",
    "description": "Discover luxury beauty products including skincare, makeup, fragrances, and more.",
    "keywords": "beauty, skincare, makeup, luxury, cosmetics, fragrance"
  },
  "promotions": {
    "discountCodes": [
      {
        "code": "WELCOME10",
        "type": "percentage",
        "value": 10,
        "minOrder": 0,
        "expires": "2026-12-31",
        "active": true
      }
    ]
  }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert default banners if not exists
INSERT INTO banners (type, data) VALUES
  ('newsBanner', '{"enabled": true, "text": "✨ Free Shipping on Orders Over $50 | New Summer Collection Available ✨", "location": "top", "schedule": {"start": "2026-01-01", "end": "2026-12-31"}}'::jsonb),
  ('promoBanner', '{"enabled": true, "title": "Summer Sale", "subtitle": "Up to 30% Off Select Products", "buttonText": "Shop Now", "buttonLink": "#shop", "backgroundImage": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&q=80", "startDate": "2026-06-01", "endDate": "2026-08-31"}'::jsonb),
  ('heroSlides', '[]'::jsonb)
ON CONFLICT (type) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update settings timestamp
CREATE OR REPLACE FUNCTION update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for settings timestamp
DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_timestamp();