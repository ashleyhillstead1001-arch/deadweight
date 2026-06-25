import { Pool } from 'pg';

/**
 * Connection pool for PostgreSQL database.
 *
 * A connection pool maintains a set of reusable database connections
 * to avoid the overhead of creating new connections for each request.
 *
 * Uses a connection string from environment variables for simplified setup.
 * Format: postgresql://username:password@host:port/database
 *
 * SSL is set for Render's managed Postgres (rejectUnauthorized:false is the
 * standard setting for connecting to Render's free/basic Postgres tier).
 */
const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: { rejectUnauthorized: false }
});

/**
 * In development with SQL logging enabled, wrap the pool to log queries,
 * timing, and row counts. In production, export the pool directly.
 */
let db = null;

if (process.env.NODE_ENV?.includes('dev') && process.env.ENABLE_SQL_LOGGING === 'true') {
    db = {
        async query(text, params) {
            try {
                const start = Date.now();
                const res = await pool.query(text, params);
                const duration = Date.now() - start;
                console.log('Executed query:', {
                    text: text.replace(/\s+/g, ' ').trim(),
                    duration: `${duration}ms`,
                    rows: res.rowCount
                });
                return res;
            } catch (error) {
                console.error('Error in query:', {
                    text: text.replace(/\s+/g, ' ').trim(),
                    error: error.message
                });
                throw error;
            }
        },

        async close() {
            await pool.end();
        }
    };
} else {
    db = pool;
}

export default db;
