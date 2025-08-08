// server.ts - Express server setup
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";
import compression from "compression";
import helmet from "helmet";

import participantRoutes from './src/routes/participants';
import meetingRoutes from './src/routes/meetings';
import historyRoutes from './src/routes/history';
import uploadRoutes from './src/routes/upload';
import dashboardRoutes from './src/routes/dashboard';
import analyticsRoutes from './src/routes/analytics';
import teamsRoutes from './src/routes/teams';
import exportRoutes from './src/routes/export';
import authRoutes from './src/routes/auth';
import organizationRoutes from './src/routes/organization';

import { MigrationRunner } from './src/migrations/migrationRunner';
import { resolveOrganization, authenticateUser } from './src/middleware/multiTenant';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

async function initializeDatabase() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log("✅ Connected to MongoDB");

    await MigrationRunner.runMigrations();

    await MigrationRunner.getMigrationStatus();

  } catch (err) {
    console.error("❌ Database initialization error:", err);
    process.exit(1);
  }
}

app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);

app.use("/api/participants", resolveOrganization, authenticateUser, participantRoutes);
app.use("/api/meetings", resolveOrganization, authenticateUser, meetingRoutes);
app.use("/api/history", resolveOrganization, authenticateUser, historyRoutes);
app.use("/api/dashboard", resolveOrganization, authenticateUser, dashboardRoutes);
app.use("/api/analytics", resolveOrganization, authenticateUser, analyticsRoutes);
app.use("/api/teams", resolveOrganization, authenticateUser, teamsRoutes);
app.use("/api/export", resolveOrganization, authenticateUser, exportRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0-enterprise-multitenant',
    features: {
      multiTenant: true,
      authentication: true,
      roleBasedAccess: true,
      enterpriseFeatures: true
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Name Spinner Backend API',
    version: '2.0.0-enterprise-multitenant',
    description: 'Multi-tenant enterprise-grade backend for Name Spinner application with advanced analytics, team management, and export functionality',
    endpoints: {
      auth: '/api/auth',
      organizations: '/api/organizations',
      meetings: '/api/meetings',
      participants: '/api/participants',
      history: '/api/history',
      dashboard: '/api/dashboard',
      analytics: '/api/analytics',
      teams: '/api/teams',
      export: '/api/export',
      health: '/api/health'
    },
    features: [
      'Multi-Tenancy',
      'Advanced Analytics',
      'Team Management',
      'Data Export (JSON, CSV, Excel)',
      'Real-time Statistics',
      'Selection Fairness Analysis',
      'Performance Metrics',
      'Enterprise Dashboard',
      'User Authentication',
      'Role-based Access Control',
      'Organization Management'
    ],
    multiTenant: {
      accessMethods: [
        'Subdomain: {org-slug}.namespinner.com',
        'Custom Domain: custom-domain.com',
        'Header: X-Organization-Slug'
      ],
      authRequired: true,
      subscriptionPlans: ['free', 'basic', 'pro', 'enterprise']
    }
  });
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: '/api'
  });
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

async function startServer() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api`);
    console.log(`💚 Health check available at http://localhost:${PORT}/api/health`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
