-- Digital Wedding Guestbook Database Schema
-- Execute this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'couple',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES users(couple_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB DEFAULT '{"show_all_submissions": false, "enable_notifications": false, "accent_color": "gold"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_contact TEXT,
  type TEXT NOT NULL CHECK (type IN ('text', 'voice', 'photo', 'video')),
  content TEXT,
  storage_path TEXT,
  storage_meta JSONB DEFAULT '{}'::jsonb,
  moderated BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_couple_id ON events(couple_id);
CREATE INDEX IF NOT EXISTS idx_submissions_event_id ON submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_sender_name ON submissions(sender_name);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_moderated ON submissions(moderated);

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('guestbook-media', 'guestbook-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for guestbook-media bucket
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guestbook-media');

-- Allow public to upload (for guest submissions)
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'guestbook-media');

-- Allow authenticated users to read their own files
CREATE POLICY "Allow authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'guestbook-media');

-- Allow public to read approved files
CREATE POLICY "Allow public read approved" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'guestbook-media');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'guestbook-media');

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Events policies
CREATE POLICY "Anyone can read events" ON events
  FOR SELECT USING (true);

CREATE POLICY "Couples can manage their events" ON events
  FOR ALL USING (auth.uid()::text IN (
    SELECT id::text FROM users WHERE couple_id = events.couple_id
  ));

-- Submissions policies
CREATE POLICY "Anyone can read approved submissions" ON submissions
  FOR SELECT USING (moderated = true OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can create submissions" ON submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update submissions" ON submissions
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete submissions" ON submissions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Sample data for testing
-- Create a test couple user
INSERT INTO users (id, couple_id, email, role)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'couple@example.com', 'couple')
ON CONFLICT (email) DO NOTHING;

-- Create a test event
INSERT INTO events (id, couple_id, title, slug, settings)
VALUES 
  ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Sarah & John Wedding', 'sarah-john-2025', '{"show_all_submissions": true, "enable_notifications": false, "accent_color": "coral"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Create sample submissions
INSERT INTO submissions (event_id, sender_name, sender_contact, type, content, moderated)
VALUES 
  ('660e8400-e29b-41d4-a716-446655440000', 'Alice Johnson', 'alice@example.com', 'text', 'Congratulations on your special day! Wishing you a lifetime of love and happiness! 🎉', true),
  ('660e8400-e29b-41d4-a716-446655440000', 'Bob Smith', 'bob@example.com', 'text', 'So happy to celebrate with you both! May your marriage be filled with joy and laughter.', true),
  ('660e8400-e29b-41d4-a716-446655440000', 'Carol White', NULL, 'text', 'Beautiful ceremony! You two are perfect together. Best wishes for your future! ❤️', false)
ON CONFLICT DO NOTHING;

