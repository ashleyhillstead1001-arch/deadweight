import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import { setupDatabase, testConnection } from './src/models/setup.js';

// Import MVC components
import routes from './src/controllers/routes.js';
import { addLocalVariables } from './src/middleware/global.js';

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

import { startSessionCleanup } from './src/utils/session-cleanup.js';

/**
 * Server configuration
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NODE_ENV = process.env.NODE_ENV?.toLowerCase() || 'production';
const PORT = process.env.PORT || 3000;

/**
 * Setup Express Server
 */
const app = express();

/**
 * 1. Security Headers (Helmet)
 */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:']
        }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

/**
 * 2. Static Files (First priority - bypasses parsers/sessions for assets)
 */
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 3. Template Engine Configuration
 */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

/**
 * 4. Request Body Parsers (MUST run before Sessions and Routes)
 */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * 5. Session Configuration (Safe now that body data is parsed)
 */
const pgSession = connectPgSimple(session);

const isProduction = NODE_ENV === 'production';

// Trust the first proxy hop (Render/Heroku/etc.) so secure cookies and
// req.protocol work correctly behind a TLS-terminating load balancer.
if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(session({
    store: new pgSession({
        conObject: {
            connectionString: process.env.DB_URL,
            ssl: { rejectUnauthorized: false }
        },
        tableName: 'session',
        createTableIfMissing: true
    }),
    name: 'deadweight.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        // Only require HTTPS-only cookies in production; over plain HTTP in
        // development a `secure` cookie is never sent back, breaking sessions.
        secure: isProduction,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

/**
 * 6. Global Custom Middleware (Has access to req.body and req.session)
 */
app.use(addLocalVariables);

/**
 * 7. Application Routing
 */
app.use('/', routes);

// Start automatic session cleanup
startSessionCleanup();

/**
 * 8. Error Handling (Always dead last)
 */
// 404 handler
app.use((req, res, next) => {
    const err = new Error('Page Not Found');
    err.status = 404;
    next(err);
});

// Global error handler
app.use((err, req, res, next) => {
    if (res.headersSent || res.finished) {
        return next(err);
    }

    const status = err.status || 500;
    const template = status === 404 ? '404' : '500';

    const context = {
        title: status === 404 ? 'Page Not Found' : 'Server Error',
        error: NODE_ENV === 'production' ? 'An error occurred' : err.message,
        stack: NODE_ENV === 'production' ? null : err.stack,
        NODE_ENV
    };

    try {
        res.status(status).render(`errors/${template}`, context);
    } catch (renderErr) {
        if (!res.headersSent) {
            res.status(status).send(`<h1>Error ${status}</h1><p>An error occurred.</p>`);
        }
    }
});

/**
 * Start WebSocket Server in Development Mode
 */
if (NODE_ENV.includes('dev')) {
    const ws = await import('ws');
    try {
        const wsPort = parseInt(PORT) + 1;
        const wsServer = new ws.WebSocketServer({ port: wsPort });

        wsServer.on('listening', () => {
            console.log(`WebSocket server is running on port ${wsPort}`);
        });

        wsServer.on('error', (error) => {
            console.error('WebSocket server error:', error);
        });
    } catch (error) {
        console.error('Failed to start WebSocket server:', error);
    }
}

/**
 * Start Server
 */
app.listen(PORT, async () => {
    await setupDatabase();
    await testConnection();
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
