# Deployment Guide for Name Spinner Backend

## 🚀 Render.com Deployment Instructions

### 1. **Pre-Deployment Checklist**

✅ **Environment Variables** - Set these in Render dashboard:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-super-secure-jwt-secret-here
PORT=(leave empty - Render sets this automatically)
REDIS_URL=redis://localhost:6379
FILE_UPLOAD_LIMIT=10MB
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15
EXPORT_CLEANUP_DAYS=7
```

### 2. **Render Service Configuration**

**Web Service Settings:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 22.x (automatic)
- **Instance Type**: Starter (or higher for production)

### 3. **Manual Deployment Steps**

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy multi-tenant backend"
   git push origin main
   ```

2. **Create Render Service**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `Name-Spinner-Backend` repository

3. **Configure Environment**:
   - Set environment variables (see list above)
   - **IMPORTANT**: Don't set PORT - let Render handle it

4. **Deploy**:
   - Click "Create Web Service"
   - Wait for build and deployment

### 4. **Production URLs**

Your backend will be available at:
- **Primary**: `https://your-service-name.onrender.com`
- **API Docs**: `https://your-service-name.onrender.com/api`
- **Health Check**: `https://your-service-name.onrender.com/api/health`

## 🔧 Troubleshooting Common Issues

### **Memory Issues (Heap Out of Memory)**
- ✅ **Fixed**: Removed nodemon from production
- ✅ **Fixed**: Using compiled JavaScript instead of ts-node
- ✅ **Fixed**: Proper production build process

### **Port Binding Issues**
- ✅ **Fixed**: Server listens on `0.0.0.0` interface
- ✅ **Fixed**: PORT type casting to number
- ✅ **Fixed**: Error handling for port conflicts

### **Build Issues**
- ✅ **Fixed**: Separated build and runtime dependencies
- ✅ **Fixed**: Removed database connection from build process
- ✅ **Fixed**: TypeScript compilation errors resolved

## 🌐 Production Features

### **Multi-Tenant Access**
Your deployed backend supports:
- **Subdomain routing**: `acme.your-service.onrender.com/api`
- **Header-based**: `X-Organization-Slug: acme`
- **Custom domains**: Configure via Render dashboard

### **API Endpoints**
All endpoints from your local development are available:
- Authentication: `/api/auth/*`
- Organizations: `/api/organizations/*`
- Meetings: `/api/meetings/*`
- Participants: `/api/participants/*`
- Analytics: `/api/analytics/*`
- Teams: `/api/teams/*`
- Export: `/api/export/*`

### **Security Features**
- ✅ JWT authentication required
- ✅ Rate limiting enabled
- ✅ CORS configured
- ✅ Helmet security headers
- ✅ Request compression

## 📊 Monitoring & Health

### **Health Check**
Monitor your deployment:
```bash
curl https://your-service-name.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-08T...",
  "uptime": 3600,
  "version": "2.0.0-enterprise-multitenant",
  "features": {
    "multiTenant": true,
    "authentication": true,
    "roleBasedAccess": true,
    "enterpriseFeatures": true
  }
}
```

### **Logs**
View logs in Render dashboard:
- Build logs for deployment issues
- Runtime logs for application errors
- Performance metrics

## 🚨 Environment Variables Required

Set these in Render Dashboard → Environment:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ |
| `MONGODB_URI` | Your MongoDB connection string | ✅ |
| `JWT_SECRET` | Secure random string (32+ chars) | ✅ |
| `REDIS_URL` | Redis connection string | ❌ |
| `FILE_UPLOAD_LIMIT` | `10MB` | ❌ |
| `RATE_LIMIT_REQUESTS` | `100` | ❌ |
| `RATE_LIMIT_WINDOW` | `15` | ❌ |
| `EXPORT_CLEANUP_DAYS` | `7` | ❌ |

## 🎯 Next Steps After Deployment

1. **Test API endpoints** using the health check
2. **Create your first organization** via `POST /api/organizations`
3. **Update frontend** to use your production API URL
4. **Set up monitoring** and alerts
5. **Configure custom domain** (optional)

## 🔄 Alternative: Docker Deployment

If Render doesn't work, you can use the included Dockerfile:

```bash
# Build image
docker build -t name-spinner-backend .

# Run container
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI="your-mongodb-uri" \
  -e JWT_SECRET="your-jwt-secret" \
  name-spinner-backend
```

---

**Your multi-tenant Name Spinner backend is now production-ready! 🚀**
