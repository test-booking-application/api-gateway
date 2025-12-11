const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL || 'http://ticket-service:3002';
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3003';

// Middleware
app.use(cors());
// NOTE: express.json() is NOT used here because it conflicts with proxy middleware
// The proxy needs to forward the raw request body

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'api-gateway',
        timestamp: new Date().toISOString()
    });
});

// API Info
app.get('/', (req, res) => {
    res.json({
        service: 'Ticket Booking API Gateway',
        version: '1.0.0',
        endpoints: {
            users: '/api/users/*',
            tickets: '/api/tickets/*',
            bookings: '/api/bookings/*'
        },
        documentation: '/api/docs'
    });
});

// API Documentation
app.get('/api/docs', (req, res) => {
    res.json({
        userService: {
            register: { method: 'POST', path: '/api/users/register' },
            login: { method: 'POST', path: '/api/users/login' },
            profile: { method: 'GET', path: '/api/users/profile' },
            updateProfile: { method: 'PUT', path: '/api/users/profile' }
        },
        ticketService: {
            getAllTickets: { method: 'GET', path: '/api/tickets' },
            getTicket: { method: 'GET', path: '/api/tickets/:id' },
            createTicket: { method: 'POST', path: '/api/tickets' },
            updateTicket: { method: 'PUT', path: '/api/tickets/:id' },
            deleteTicket: { method: 'DELETE', path: '/api/tickets/:id' }
        },
        bookingService: {
            createBooking: { method: 'POST', path: '/api/bookings' },
            getBookings: { method: 'GET', path: '/api/bookings' },
            getBooking: { method: 'GET', path: '/api/bookings/:id' },
            cancelBooking: { method: 'DELETE', path: '/api/bookings/:id' },
            getStats: { method: 'GET', path: '/api/bookings/stats/summary' }
        }
    });
});

// Proxy configuration options
const proxyOptions = {
    changeOrigin: true,
    logLevel: 'debug',
    proxyTimeout: 30000, // 30 seconds timeout for backend
    timeout: 30000, // 30 seconds timeout for request
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying ${req.method} request to: ${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`Received response with status: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({
            error: 'Gateway error',
            message: 'Unable to reach the requested service',
            details: err.message
        });
    }
};

// Route proxies
app.use('/api/users', createProxyMiddleware({
    target: USER_SERVICE_URL,
    ...proxyOptions
}));

app.use('/api/tickets', createProxyMiddleware({
    target: TICKET_SERVICE_URL,
    ...proxyOptions
}));

app.use('/api/bookings', createProxyMiddleware({
    target: BOOKING_SERVICE_URL,
    ...proxyOptions
}));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        availableRoutes: ['/api/users', '/api/tickets', '/api/bookings']
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`User Service: ${USER_SERVICE_URL}`);
    console.log(`Ticket Service: ${TICKET_SERVICE_URL}`);
    console.log(`Booking Service: ${BOOKING_SERVICE_URL}`);
});
