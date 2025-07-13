-- ================================================
-- Core Tables DDL
-- Authentication, Users, and Sessions
-- ================================================

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR NOT NULL PRIMARY KEY,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    display_name VARCHAR,
    profile_image_url VARCHAR,
    provider VARCHAR,
    provider_id VARCHAR,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_email_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    external_id VARCHAR(20),
    language VARCHAR(10) DEFAULT 'en'::character varying,
    locale VARCHAR(20),
    native_language VARCHAR(10),
    stripe_customer_id VARCHAR,
    stripe_subscription_id VARCHAR,
    subscription_status VARCHAR(50),
    role_id INTEGER REFERENCES roles(id),
    is_super_admin BOOLEAN DEFAULT false
);

CREATE UNIQUE INDEX users_email_unique ON public.users USING btree (email);
CREATE UNIQUE INDEX users_external_id_key ON public.users USING btree (external_id);
CREATE INDEX idx_users_role ON public.users USING btree (role_id);

-- Table: user_providers
CREATE TABLE IF NOT EXISTS user_providers (
    id INTEGER NOT NULL DEFAULT nextval('user_providers_id_seq'::regclass) PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    provider VARCHAR NOT NULL,
    provider_id VARCHAR NOT NULL,
    provider_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table: user_session_metadata
CREATE TABLE IF NOT EXISTS user_session_metadata (
    id INTEGER NOT NULL DEFAULT nextval('user_session_metadata_id_seq'::regclass) PRIMARY KEY,
    user_id VARCHAR REFERENCES users(id),
    session_id VARCHAR NOT NULL,
    device_info JSONB NOT NULL,
    browser_info JSONB NOT NULL,
    network_info JSONB NOT NULL,
    capabilities JSONB NOT NULL,
    preferences JSONB NOT NULL,
    session_config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table: sessions
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);

-- Table: local_users
CREATE TABLE IF NOT EXISTS local_users (
    user_id VARCHAR NOT NULL PRIMARY KEY REFERENCES users(id),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


