-- Deadweight database seed and schema
-- Defines the core production schema and sample data for Deadweight,
-- a student move-out storage service.

BEGIN;

-- ---------------------------------------------------------------------------
-- Clean slate: drop in reverse dependency order, plus custom types
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS item_images CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS status_history CASCADE;
DROP TABLE IF EXISTS storage_requests CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS user_role;

-- ---------------------------------------------------------------------------
-- Custom enum types (DB-level data integrity)
-- ---------------------------------------------------------------------------
-- Three roles map to the business: owner (full admin), staff (employees who
-- handle pickups/requests), and customer (the student storing belongings).
CREATE TYPE user_role AS ENUM ('owner', 'staff', 'customer');

-- One defined, ordered set of workflow stages, used everywhere a status
-- appears. The request moves: requested -> approved -> awaiting_pickup ->
-- in_storage -> out_for_return -> returned.
CREATE TYPE request_status AS ENUM (
    'requested',
    'approved',
    'awaiting_pickup',
    'in_storage',
    'out_for_return',
    'returned'
);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,          -- bcrypt hash, never plain text
    role        user_role NOT NULL DEFAULT 'customer',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- contact_messages
-- user_id is nullable + SET NULL: non-registered visitors can contact us,
-- and deleting a user shouldn't erase the message history.
-- ---------------------------------------------------------------------------
CREATE TABLE contact_messages (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(255) NOT NULL,
    subject      VARCHAR(255) NOT NULL,
    message      TEXT NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'received'
                 CHECK (status IN ('received', 'replied', 'closed')),
    received_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- storage_requests  (the core resource + workflow)
-- user_id CASCADE: a request belongs to its owner; if the account is deleted,
-- the request goes with it.
-- ---------------------------------------------------------------------------
CREATE TABLE storage_requests (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name         VARCHAR(255) NOT NULL,
    item_description  TEXT,
    requested_volume  NUMERIC(8,2) NOT NULL CHECK (requested_volume >= 0),
    pickup_date       DATE,
    return_date       DATE,
    current_status    request_status NOT NULL DEFAULT 'requested',
    notes             TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- status_history  (every stage change is logged for the timeline view)
-- request CASCADE: history is meaningless without its request.
-- changed_by SET NULL: keep the history even if the staff member is removed.
-- ---------------------------------------------------------------------------
CREATE TABLE status_history (
    id                  SERIAL PRIMARY KEY,
    storage_request_id  INTEGER NOT NULL REFERENCES storage_requests(id) ON DELETE CASCADE,
    status              request_status NOT NULL,
    changed_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    note                TEXT,
    changed_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- reviews
-- user_id CASCADE: a user's reviews are theirs.
-- storage_request_id SET NULL: a review can outlive the specific request it
-- referenced (kept as general service feedback).
-- ---------------------------------------------------------------------------
CREATE TABLE reviews (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_request_id  INTEGER REFERENCES storage_requests(id) ON DELETE SET NULL,
    rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- item_images  (one-to-many with a request)
-- ---------------------------------------------------------------------------
CREATE TABLE item_images (
    id                  SERIAL PRIMARY KEY,
    storage_request_id  INTEGER NOT NULL REFERENCES storage_requests(id) ON DELETE CASCADE,
    file_name           VARCHAR(255) NOT NULL,
    file_url            TEXT NOT NULL,
    mime_type           VARCHAR(100),
    caption             VARCHAR(255),
    uploaded_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================================
-- SEED DATA
-- ===========================================================================
-- NOTE: every password below is the SAME bcrypt hash of the string  P@$$w0rd!
-- Replace the placeholder $2b$10$TdWqwduzpC3kPA..SnhhXOubmP4jkmtWhFW/dsJHgp22.bYXTo55O with a real hash you generate
-- locally (see the note that came with this file). All five accounts share
-- the password  P@$$w0rd!  so each role is easy to test.

-- One account per role (owner, staff, customer) + extra customers for data
INSERT INTO users (name, email, password, role) VALUES
    ('Avery Blake',  'owner@deadweight.example',    '$2b$10$TdWqwduzpC3kPA..SnhhXOubmP4jkmtWhFW/dsJHgp22.bYXTo55O', 'owner'),
    ('Jules Morgan', 'staff@deadweight.example',    '$2b$10$TdWqwduzpC3kPA..SnhhXOubmP4jkmtWhFW/dsJHgp22.bYXTo55O', 'staff'),
    ('Morgan Lee',   'customer@deadweight.example', '$2b$10$TdWqwduzpC3kPA..SnhhXOubmP4jkmtWhFW/dsJHgp22.bYXTo55O', 'customer'),
    ('Taylor Brooks','taylor.brooks@deadweight.example', '$2b$10$TdWqwduzpC3kPA..SnhhXOubmP4jkmtWhFW/dsJHgp22.bYXTo55O', 'customer'),
    ('Sam Rivera',   'sam.rivera@deadweight.example',    '$2b$10$TdWqwduzpC3kPA..SnhhXOubmP4jkmtWhFW/dsJHgp22.bYXTo55O', 'customer');

-- Storage requests (statuses drawn from the request_status enum)
INSERT INTO storage_requests
    (user_id, item_name, item_description, requested_volume, pickup_date, return_date, current_status, notes) VALUES
    (3, 'Winter Clothing',      'Two large bins of winter coats, boots, and linens.',        4.50, '2026-05-05', '2026-08-20', 'awaiting_pickup', 'Pre-summer move-out storage.'),
    (3, 'Dorm Furniture',       'Desk lamp, futon frame, and a folding chair.',              6.00, '2026-05-06', '2026-08-22', 'requested',       'Awaiting staff approval.'),
    (4, 'Textbooks & Supplies', 'Three boxes of textbooks and school supplies.',             2.25, '2026-05-01', '2026-08-18', 'in_storage',      'Stored for the summer.'),
    (5, 'Mini Fridge',          'Compact dorm refrigerator, cleaned and defrosted.',         1.80, '2026-05-03', '2026-08-19', 'returned',        'Returned at semester start.');

-- Status history: each request's full timeline
INSERT INTO status_history (storage_request_id, status, changed_by, note, changed_at) VALUES
    (1, 'requested',       3, 'Request created by customer',     '2026-04-20 09:12:00'),
    (1, 'approved',        2, 'Staff approved the request',      '2026-04-21 14:30:00'),
    (1, 'awaiting_pickup', 2, 'Bins dropped off, ready for pickup', '2026-04-23 08:00:00'),
    (2, 'requested',       3, 'Request created by customer',     '2026-04-22 10:45:00'),
    (3, 'requested',       4, 'Request created by customer',     '2026-04-15 12:00:00'),
    (3, 'approved',        2, 'Staff approved the request',      '2026-04-16 09:45:00'),
    (3, 'awaiting_pickup', 2, 'Ready for collection',            '2026-04-18 08:30:00'),
    (3, 'in_storage',      2, 'Items received into storage',     '2026-04-20 16:20:00'),
    (4, 'requested',       5, 'Request created by customer',     '2026-04-10 11:00:00'),
    (4, 'approved',        2, 'Staff approved the request',      '2026-04-11 10:15:00'),
    (4, 'in_storage',      2, 'Items received into storage',     '2026-04-14 13:00:00'),
    (4, 'out_for_return',  2, 'Out for return delivery',         '2026-08-18 09:00:00'),
    (4, 'returned',        2, 'Returned to customer',            '2026-08-19 15:30:00');

-- Reviews
INSERT INTO reviews (user_id, storage_request_id, rating, comment) VALUES
    (3, 1, 5, 'The pickup team was prompt and handled everything carefully.'),
    (4, 3, 4, 'Great service; I would love more updates while items are in storage.'),
    (5, 4, 5, 'Returned exactly on time and in perfect condition. Stress gone.');

-- Contact messages (status uses the received/replied/closed check)
INSERT INTO contact_messages (user_id, name, email, subject, message, status) VALUES
    (3,    'Morgan Lee',   'customer@deadweight.example', 'Pickup scheduling question', 'Can I move my pickup to May 6th instead of May 5th?', 'received'),
    (NULL, 'Jamie Parker', 'jamie.parker@example.com',    'Partnership inquiry',         'I run a local moving company interested in partnering for move-out season.', 'received'),
    (4,    'Taylor Brooks','taylor.brooks@deadweight.example', 'Labeling question',      'Should I label each box by room before pickup?', 'replied');

-- Item images (one-to-many with requests)
INSERT INTO item_images (storage_request_id, file_name, file_url, mime_type, caption) VALUES
    (1, 'winter_clothing_1.jpg', 'https://example.com/uploads/winter_clothing_1.jpg', 'image/jpeg', 'Bin 1 of winter clothing'),
    (1, 'winter_clothing_2.jpg', 'https://example.com/uploads/winter_clothing_2.jpg', 'image/jpeg', 'Bin 2 of winter clothing'),
    (3, 'textbooks_box_1.jpg',   'https://example.com/uploads/textbooks_box_1.jpg',   'image/jpeg', 'Boxed textbooks'),
    (4, 'mini_fridge.jpg',       'https://example.com/uploads/mini_fridge.jpg',       'image/jpeg', 'Cleaned mini fridge before storage');

COMMIT;
