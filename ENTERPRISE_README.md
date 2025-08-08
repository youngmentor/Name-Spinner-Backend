# 🚀 Name Spinner Backend - Enterprise Edition

A comprehensive, enterprise-grade Node.js backend for the Name Spinner application featuring advanced analytics, team management, data export capabilities, and sophisticated participant selection algorithms.

## 🎯 Features

### Core Features

- ✅ **Meeting Management** - Create, manage, and track meetings
- ✅ **Participant Management** - Add participants via CSV/Excel upload
- ✅ **Smart Selection** - Random, weighted, and manual selection methods
- ✅ **Selection History** - Complete audit trail of all selections

### Enterprise Features

- 📊 **Advanced Analytics** - Comprehensive dashboard and reporting
- 🏢 **Team Management** - Organize participants into teams/departments
- 📈 **Performance Metrics** - Selection fairness, engagement scores
- 📤 **Data Export** - JSON, CSV, Excel format exports
- 🔍 **Real-time Statistics** - Live dashboard with trends
- ⚡ **Performance Optimization** - Efficient MongoDB aggregations
- 🔒 **Enterprise Security** - Input validation, error handling

## 🏗️ Technology Stack

- **Runtime**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **Language**: TypeScript
- **File Processing**: CSV Parser, XLSX
- **Export**: CSV Writer, Excel generation
- **Security**: Helmet, Compression, CORS

## 📋 API Endpoints

### 🎯 Dashboard APIs

```
GET  /api/dashboard/stats           # Dashboard statistics
GET  /api/dashboard/recent-meetings # Recent meetings
GET  /api/dashboard/top-participants # Top participants
```

### 📊 Analytics APIs

```
GET  /api/analytics/overview             # Analytics overview
GET  /api/analytics/weekly-activity      # Weekly activity data
GET  /api/analytics/department-performance # Department metrics
GET  /api/analytics/selection-fairness   # Fairness analysis
GET  /api/analytics/peak-hours           # Peak usage hours
GET  /api/analytics/engagement-score     # Engagement metrics
```

### 🏢 Team Management APIs

```
GET    /api/teams                 # Get all teams
POST   /api/teams                 # Create team
GET    /api/teams/:id             # Get team details
PUT    /api/teams/:id             # Update team
DELETE /api/teams/:id             # Delete team
GET    /api/teams/:id/members     # Get team members
POST   /api/teams/:id/members     # Add team member
DELETE /api/teams/:id/members/:memberId # Remove member
GET    /api/teams/:id/performance # Team performance
```

### 📤 Export APIs

```
POST /api/export/meeting/:id    # Export meeting data
POST /api/export/analytics      # Export analytics
POST /api/export/participants   # Export participants
POST /api/export/teams          # Export teams
GET  /api/export/status/:id     # Check export status
GET  /api/export/download/:file # Download export
```

### 👥 Enhanced Meeting APIs

```
GET    /api/meetings              # Get meetings (enhanced)
POST   /api/meetings              # Create meeting
GET    /api/meetings/:id          # Get meeting with stats
PUT    /api/meetings/:id          # Update meeting
DELETE /api/meetings/:id          # Delete meeting
GET    /api/meetings/:id/participants # Get participants
POST   /api/meetings/:id/add-participants # Add participants
```

### 📝 Enhanced Selection APIs

```
GET    /api/history               # Get selection history
POST   /api/history               # Create selection record
POST   /api/history/select        # Smart participant selection
DELETE /api/history/clear         # Clear history
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/name-spinner

# Server
PORT=5000
NODE_ENV=development

# Optional Enterprise Features
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-key
FILE_UPLOAD_LIMIT=10MB
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15
EXPORT_CLEANUP_DAYS=7
```

### 3. Build and Start

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 4. Verify Installation

Visit `http://localhost:5000/api` for API documentation

## 🔄 Migration Guide

The backend automatically runs migrations on startup to enhance existing data with enterprise features.

### Automatic Migrations

**Migration 001: Add Enterprise Fields**

- Adds `status`, `settings`, `statistics` to existing meetings
- Adds `department`, `isActive`, `totalMeetings` to participants
- Sets sensible defaults for all new fields

**Migration 002: Migrate Selection History**

- Migrates old `SelectionHistory` records to new `SelectionRecord` model
- Preserves all existing data with enhanced metadata
- Updates participant selection counts

### Manual Migration Control

```typescript
// Run migrations manually
import { MigrationRunner } from "./src/migrations/migrationRunner";

// Run all pending migrations
await MigrationRunner.runMigrations();

// Check migration status
await MigrationRunner.getMigrationStatus();

// Rollback specific migration
await MigrationRunner.rollbackMigration("001");
```

## 📊 Database Schema

### Enhanced Meeting Schema

```typescript
{
  name: string;
  department: string;
  description?: string;
  isActive: boolean;
  participants: IParticipant[];
  // Enterprise fields
  teamId?: ObjectId;
  status: 'active' | 'scheduled' | 'completed' | 'archived';
  settings: {
    spinDuration: number;
    excludeRecentlySelected: boolean;
    allowManualSelection: boolean;
    selectionMethod: 'random' | 'weighted' | 'manual';
  };
  statistics: {
    totalSpins: number;
    totalParticipants: number;
    lastActivity?: Date;
    averageSpinDuration?: number;
  };
}
```

### Enhanced Participant Schema

```typescript
{
  name: string;
  email?: string;
  role?: string;
  department: string;
  // Enterprise fields
  meetingId?: ObjectId;
  teamId?: ObjectId;
  isActive: boolean;
  avatar?: string;
  selectionCount: number;
  totalMeetings: number;
  lastSelected?: Date;
  metadata?: Map<string, any>;
}
```

### New Team Schema

```typescript
{
  name: string;
  description?: string;
  color: string;
  leadId?: ObjectId;
  members: [{
    participantId: ObjectId;
    role: string;
    joinedAt: Date;
  }];
  settings: Map<string, any>;
}
```

### Enhanced Selection Record Schema

```typescript
{
  meetingId: ObjectId;
  participantId: ObjectId;
  participantName: string;
  department: string;
  teamId?: ObjectId;
  selectionDuration?: number;
  sessionId?: string;
  selectionMethod: 'random' | 'weighted' | 'manual';
  metadata?: {
    excludedRecentlySelected?: boolean;
    totalEligible?: number;
    spinDuration?: number;
    selectionRound?: number;
  };
  selectedAt: Date;
}
```

## 🎮 Advanced Selection Methods

### Random Selection (Default)

```typescript
POST /api/history/select
{
  "meetingId": "meeting_id",
  "department": "Engineering",
  "selectionMethod": "random",
  "excludeRecentlySelected": true
}
```

### Weighted Selection

Favors participants with fewer previous selections:

```typescript
POST /api/history/select
{
  "meetingId": "meeting_id",
  "department": "Engineering",
  "selectionMethod": "weighted"
}
```

### Manual Selection

Returns eligible participants for manual choice:

```typescript
POST /api/history/select
{
  "meetingId": "meeting_id",
  "department": "Engineering",
  "selectionMethod": "manual"
}
```

## 📈 Analytics Examples

### Dashboard Statistics Response

```json
{
  "totalMeetings": 25,
  "activeParticipants": 150,
  "spinsThisMonth": 89,
  "avgSelectionTime": "3s",
  "trends": {
    "meetings": "+12%",
    "participants": "+8%",
    "spins": "+23%",
    "responseTime": "-5%"
  }
}
```

### Weekly Activity Response

```json
{
  "data": [
    {
      "day": "Mon",
      "date": "2025-08-01",
      "selections": 15
    },
    {
      "day": "Tue",
      "date": "2025-08-02",
      "selections": 22
    }
  ]
}
```

### Selection Fairness Response

```json
{
  "fairnessScore": 85,
  "participantsSelectedAtLeastOnce": 127,
  "totalParticipants": 150,
  "selectionDistribution": [
    {
      "participantId": "participant_id",
      "participantName": "John Doe",
      "selectionCount": 5
    }
  ]
}
```

## 📤 Export Examples

### Create Export Job

```typescript
POST /api/export/analytics
{
  "format": "excel",
  "dateRange": {
    "start": "2025-07-01",
    "end": "2025-08-01"
  }
}

Response:
{
  "jobId": "export_job_id",
  "status": "pending",
  "type": "analytics",
  "format": "excel",
  "expiresAt": "2025-08-08T12:00:00Z"
}
```

### Check Export Status

```typescript
GET /api/export/status/export_job_id

Response:
{
  "id": "export_job_id",
  "status": "completed",
  "downloadUrl": "/api/export/download/analytics-export-uuid.xlsx",
  "expiresAt": "2025-08-08T12:00:00Z"
}
```

## 🔧 Performance Optimizations

### MongoDB Indexes

```javascript
// Automatic indexes created by models
db.meetings.createIndex({ teamId: 1 });
db.meetings.createIndex({ status: 1 });
db.meetings.createIndex({ department: 1 });

db.participants.createIndex({ meetingId: 1, department: 1 });
db.participants.createIndex({ teamId: 1 });
db.participants.createIndex({ selectionCount: -1 });

db.selectionrecords.createIndex({ meetingId: 1, selectedAt: -1 });
db.selectionrecords.createIndex({ department: 1, selectedAt: -1 });
```

### Aggregation Pipelines

Efficient analytics calculations using MongoDB aggregation framework for optimal performance.

## 🔒 Security Features

- **Input Validation**: Joi schema validation
- **Rate Limiting**: Configurable request limits
- **Security Headers**: Helmet middleware
- **CORS**: Configurable cross-origin policies
- **Error Handling**: Comprehensive error responses
- **File Upload Security**: Type and size validation

## 🧪 Testing

### Health Check

```bash
curl http://localhost:5000/api/health
```

### API Testing

```bash
# Get dashboard stats
curl http://localhost:5000/api/dashboard/stats

# Get analytics overview
curl http://localhost:5000/api/analytics/overview

# Get all teams
curl http://localhost:5000/api/teams
```

## 🔄 Backward Compatibility

All existing API endpoints continue to work exactly as before:

- `/api/meetings` - Enhanced with additional data
- `/api/participants` - Enhanced with new fields
- `/api/history` - Uses new model but returns compatible format

Your existing frontend will work without any changes while gaining access to enhanced features.

## 📚 Additional Resources

- **API Documentation**: Visit `/api` endpoint for interactive docs
- **Migration Logs**: Check console output during startup
- **Export Files**: Automatically cleaned up after 24 hours
- **Error Logs**: Check console for detailed error information

## 🎯 Next Steps

1. **Start the server** and verify all migrations run successfully
2. **Test existing functionality** to ensure backward compatibility
3. **Explore new endpoints** using the API documentation
4. **Update your frontend** to use enhanced features
5. **Configure teams** and explore analytics dashboards

## 🤝 Support

The backend provides comprehensive error messages and logging. Check the console output for detailed information about any issues.

### Common Issues

**Migration Failures**: Check MongoDB connection and permissions
**Export Errors**: Ensure write permissions for export directory
**Performance Issues**: Verify MongoDB indexes are created

---

**🚀 Your Name Spinner backend is now enterprise-ready with advanced analytics, team management, and export capabilities!**
