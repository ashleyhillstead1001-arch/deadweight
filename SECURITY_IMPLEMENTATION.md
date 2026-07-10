# Security Implementation Summary

## Overview

Comprehensive security hardening pass has been completed for the Deadweight admin dashboard and all form handling, including rate limiting, input validation/sanitization, and role-based access control.

## Security Measures Implemented

### 1. Rate Limiting Middleware

**File**: `src/middleware/rate-limit.js`

- **Login Rate Limit**: 5 attempts per 15 minutes
- **Registration Rate Limit**: 3 attempts per hour
- **Contact Form Rate Limit**: 5 submissions per hour
- Automatically skips rate limiting in development mode (NODE_ENV=development)

### 2. Input Validation & Sanitization

Applied across all form endpoints using `express-validator`:

#### Authentication Forms

- **Email**: `.trim().isEmail().normalizeEmail().isLength({max:255}).escape()`
- **Password**: `.isLength({min:8, max:255})` + requires number and special character
- **Name**: `.trim().escape().isLength({max:255})`

#### Contact Form

- **Name**: `.trim().escape().isLength({max:255})`
- **Email**: `.trim().isEmail().normalizeEmail().isLength({max:255}).escape()`
- **Subject**: `.trim().escape().isLength({max:255})`
- **Message**: `.trim().escape().isLength({max:10000})`

#### Storage Request Forms

- **Item Name**: `.trim().escape().isLength({max:255})`
- **Descriptions/Notes**: `.trim().escape().isLength({max:5000})`
- **Volume**: `.isInt({max:100000})`

#### Review Submission

- **Rating**: `isInt({min:1, max:5})`
- **Comment**: `.trim().escape().isLength({max:2000}).optional()`

### 3. Security Headers (Helmet.js)

**File**: `server.js`

Content Security Policy (CSP) configured:

- `defaultSrc: ["'self'"]` - Only allow resources from same origin by default
- `styleSrc: ["'self'", "'unsafe-inline'"]` - Allow inline styles (required for app)
- `scriptSrc: ["'self'"]` - Only allow scripts from same origin
- `imgSrc: ["'self'", "data:", "https:"]` - Allow local, data URIs, and HTTPS images

Referrer Policy: `strict-origin-when-cross-origin`

### 4. Non-Leaky Error Messages

Removed specific error messages that could reveal sensitive information:

- **Login**: Doesn't distinguish between "email not found" vs "wrong password"
- **Registration**: Doesn't reveal if email already exists
- **Admin operations**: Generic redirects on authorization failures

### 5. Role-Based Access Control (RBAC)

**File**: `src/middleware/auth.js`

Three roles with increasing privileges:

- **Customer (customer)**: Can manage own requests and leave reviews
- **Staff (staff)**: Can view all requests, respond to messages, BUT cannot access admin dashboard
- **Owner (owner)**: Full admin access, can manage users, requests, and reviews

Access Pattern:

- Public routes: Accessible without login
- Protected routes (dashboard, requests, etc): Require login
- Staff routes (/requests/all, /contact/responses): Require staff or owner role
- Admin routes (/admin, /register/list): Require owner role only

### 6. SQL Injection Prevention

All database queries use parameterized queries (prepared statements):

```javascript
// Example from updateUserRole
const query = "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2";
await db.query(query, [role, userId]);
```

### 7. XSS Prevention

- EJS templates automatically escape output by default
- All user input is escaped with `.escape()` before database insertion
- Dangerous HTML characters are converted to entities

## Verified Security Tests

### ✓ Access Control

- Customer cannot access /admin (403 Forbidden)
- Staff cannot access /admin (403 Forbidden)
- Owner can access /admin dashboard
- Non-admin links hidden in header for non-owner roles

### ✓ Input Validation

- Oversized inputs rejected (max length validation)
- Special characters properly escaped in output
- Form validation prevents submission of invalid data

### ✓ Error Handling

- Login failures don't reveal if email exists
- Registration failures use generic messages
- Admin operation errors don't leak sensitive info

### ✓ Rate Limiting

- Middleware in place on all sensitive endpoints
- Automatically skips in dev mode for testing
- Can be verified by setting NODE_ENV=production

## Modified Files

1. **Server Configuration**
   - `server.js` - Added Helmet security headers
   - `package.json` - Added helmet and express-rate-limit dependencies

2. **Middleware**
   - `src/middleware/rate-limit.js` - NEW, rate limiting configuration
   - `src/middleware/auth.js` - Existing RBAC (unchanged)

3. **Form Controllers**
   - `src/controllers/forms/login.js` - Added validation, rate limiting, non-leaky errors
   - `src/controllers/forms/registration.js` - Added validation, rate limiting, non-leaky errors
   - `src/controllers/forms/contact.js` - Added validation, rate limiting, escaping
   - `src/controllers/requests/requests.js` - Enhanced input validation with max lengths

4. **Admin Features**
   - `src/controllers/admin.js` - NEW, admin dashboard controller with security checks
   - `src/views/admin/dashboard.ejs` - NEW, admin UI with role management, request control, etc.

## Installation & Testing

1. **Install Dependencies**

   ```bash
   pnpm install
   ```

2. **Start Application**

   ```bash
   npm start
   ```

3. **Test Each Role**
   - Customer: Email: `customer@deadweight.example`, Password: `P@$$w0rd!`
   - Staff: Email: `staff@deadweight.example`, Password: `P@$$w0rd!`
   - Owner: Email: `owner@deadweight.example`, Password: `P@$$w0rd!`

4. **Verify Access**
   - Customer: See personal dashboard only, cannot access /admin
   - Staff: See all requests/messages, cannot access /admin
   - Owner: Full admin access, can manage users and content

## Dependencies Added

- `helmet@^7.1.0` - Security headers middleware
- `express-rate-limit@^7.1.5` - Rate limiting middleware

Both packages are production-grade and widely used in Express.js applications.

## Security Best Practices Applied

✓ Defense in depth - Multiple layers of security
✓ Principle of least privilege - Users only see what they need
✓ Input validation on server-side (not just client)
✓ Output escaping to prevent XSS
✓ Parameterized queries to prevent SQL injection
✓ Rate limiting on sensitive endpoints
✓ Non-leaky error messages
✓ Security headers with CSP
✓ Role-based access control

## Notes

- Rate limiting skips in development mode for easier testing
- All form handlers include comprehensive validation
- Admin operations require owner role (strict access control)
- Database is PostgreSQL with role-based constraints
- Session management uses connect-pg-simple (secure Postgres backend)
