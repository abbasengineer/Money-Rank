-- Migration: Add forum tables for blog posts, daily threads, comments, and votes
-- Run this migration to add forum functionality

-- Create forum_posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_type VARCHAR(20) NOT NULL DEFAULT 'blog', -- 'blog' or 'daily_thread' or 'custom_thread'
  challenge_date_key VARCHAR(10), -- For daily_thread posts, links to challenge date
  is_pinned BOOLEAN DEFAULT false NOT NULL,
  upvote_count INTEGER DEFAULT 0 NOT NULL,
  comment_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create forum_comments table
CREATE TABLE IF NOT EXISTS forum_comments (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id VARCHAR(255) NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id VARCHAR(255) REFERENCES forum_comments(id) ON DELETE CASCADE, -- For nested replies
  upvote_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create forum_votes table
CREATE TABLE IF NOT EXISTS forum_votes (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id VARCHAR(255) REFERENCES forum_posts(id) ON DELETE CASCADE,
  comment_id VARCHAR(255) REFERENCES forum_comments(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) DEFAULT 'upvote' NOT NULL, -- 'upvote' for now, can extend later
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT check_vote_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  CONSTRAINT unique_user_vote_post UNIQUE (user_id, post_id),
  CONSTRAINT unique_user_vote_comment UNIQUE (user_id, comment_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS forum_posts_author_idx ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS forum_posts_type_idx ON forum_posts(post_type);
CREATE INDEX IF NOT EXISTS forum_posts_date_key_idx ON forum_posts(challenge_date_key);
CREATE INDEX IF NOT EXISTS forum_posts_created_idx ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_upvotes_idx ON forum_posts(upvote_count DESC);

CREATE INDEX IF NOT EXISTS forum_comments_post_idx ON forum_comments(post_id);
CREATE INDEX IF NOT EXISTS forum_comments_user_idx ON forum_comments(user_id);
CREATE INDEX IF NOT EXISTS forum_comments_parent_idx ON forum_comments(parent_id);
CREATE INDEX IF NOT EXISTS forum_comments_created_idx ON forum_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS forum_votes_post_idx ON forum_votes(post_id);
CREATE INDEX IF NOT EXISTS forum_votes_comment_idx ON forum_votes(comment_id);
CREATE INDEX IF NOT EXISTS forum_votes_user_idx ON forum_votes(user_id);

