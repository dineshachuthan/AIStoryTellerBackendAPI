-- ================================================
-- Database Setup Script
-- Run this first to create the database
-- ================================================

-- Create database if not exists (run as superuser)
-- CREATE DATABASE storytelling_app;

-- Connect to the database
-- \c storytelling_app;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";