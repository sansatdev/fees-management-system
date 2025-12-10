const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const studentRoutes = require('./routes/student.routes');
const courseRoutes = require('./routes/course.routes');
const batchRoutes = require('./routes/batch.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const paymentRoutes = require('./routes/payment.routes');
const dueRoutes = require('./routes/due.routes');
const reportRoutes = require('./routes/report.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const expenseRoutes = require('./routes/expense.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const inquiryRoutes = require('./routes/inquiry.routes');
const notificationRoutes = require('./routes/notification.routes');
const settingsRoutes = require('./routes/settings.routes');

// Import middleware
const { authenticate } = require('./middleware/auth.middleware');
const { errorHandler } = require('./middleware/error.middleware');

// Initialize Express app
const app = express();

// ================== Winston Logger Configuration ==================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'fees-management-system' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Make logger available globally
app.set('logger', logger);

// ================== Security Middleware ==================
// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// ================== Rate Limiting ==================
// General rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});

// Strict rate limiter for authentication - 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes'
    });
  }
});

// Apply general rate limiter to all requests
app.use(generalLimiter);

// ================== Request Parsing Middleware ==================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================== Morgan HTTP Request Logger ==================
// Custom Morgan token for logging user
morgan.token('user', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

// Morgan format
const morganFormat = process.env.NODE_ENV === 'production' 
  ? ':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'
  : 'dev';

// Create stream for Winston
const stream = {
  write: (message) => logger.http(message.trim())
};

app.use(morgan(morganFormat, { stream }));

// ================== Health Check Endpoint ==================
app.get('/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0'
  };

  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.message = error.message;
    res.status(503).json(healthCheck);
  }
});

// ================== API Routes ==================
const API_VERSION = process.env.API_VERSION || 'v1';
const API_PREFIX = `/api/${API_VERSION}`;

// Public routes
app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);

// Protected routes - require authentication
app.use(`${API_PREFIX}/users`, authenticate, userRoutes);
app.use(`${API_PREFIX}/students`, authenticate, studentRoutes);
app.use(`${API_PREFIX}/courses`, authenticate, courseRoutes);
app.use(`${API_PREFIX}/batches`, authenticate, batchRoutes);
app.use(`${API_PREFIX}/enrollments`, authenticate, enrollmentRoutes);
app.use(`${API_PREFIX}/payments`, authenticate, paymentRoutes);
app.use(`${API_PREFIX}/dues`, authenticate, dueRoutes);
app.use(`${API_PREFIX}/reports`, authenticate, reportRoutes);
app.use(`${API_PREFIX}/dashboard`, authenticate, dashboardRoutes);
app.use(`${API_PREFIX}/expenses`, authenticate, expenseRoutes);
app.use(`${API_PREFIX}/attendance`, authenticate, attendanceRoutes);
app.use(`${API_PREFIX}/inquiries`, authenticate, inquiryRoutes);
app.use(`${API_PREFIX}/notifications`, authenticate, notificationRoutes);
app.use(`${API_PREFIX}/settings`, authenticate, settingsRoutes);

// ================== Root Route ==================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Fees Management System API',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: `${API_PREFIX}`,
      documentation: `${API_PREFIX}/docs`
    }
  });
});

// ================== 404 Handler ==================
app.use((req, res, next) => {
  logger.warn(`404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.originalUrl
  });
});

// ================== Global Error Handler ==================
app.use((err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.id : 'anonymous'
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Invalid or expired token'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate value for field: ${field}`
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ================== Graceful Shutdown ==================
const gracefulShutdown = (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// ================== Server Startup ==================
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`=================================================`);
  logger.info(`🚀 Fees Management System Server Started`);
  logger.info(`=================================================`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Server URL: http://${HOST}:${PORT}`);
  logger.info(`API Base: ${API_PREFIX}`);
  logger.info(`Health Check: http://${HOST}:${PORT}/health`);
  logger.info(`=================================================`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      logger.error(`Port ${PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

module.exports = app;
