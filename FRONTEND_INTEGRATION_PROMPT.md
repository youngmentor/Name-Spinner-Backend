# Multi-Tenant Name Spinner Backend API Integration Guide

## Overview

I need you to integrate my enhanced **multi-tenant** Name Spinner Backend API into my existing frontend codebase. The backend has been completely transformed into an enterprise-grade **multi-tenant SaaS system** with organization management, user authentication, role-based access control, subscription management, and all the enterprise features from before.

**🔥 NEW: Multi-Tenancy Support**

- Each organization has isolated data and users
- Subdomain-based access (e.g., `acme.namespinner.com`)
- JWT authentication required for all endpoints
- Role-based permissions and subscription limits
- Organization signup and management

**Backend Base URL:** `https://{org-slug}.namespinner.com/api` or `http://localhost:5000/api`
**Current Version:** `2.0.0-enterprise-multitenant`

## 🎯 Integration Requirements

1. **Implement Multi-Tenancy** - Support organization-based routing and data isolation
2. **Add Authentication System** - JWT-based login/signup with organization context
3. **Maintain Existing UI/UX** - All current functionality should continue to work
4. **Add New Enterprise Features** - Integrate dashboard, analytics, teams, and export features
5. **Update API Calls** - All endpoints now require authentication and organization context
6. **Handle New Data Structures** - Update interfaces and types for enhanced models
7. **Implement Role-Based Access** - Show/hide features based on user permissions
8. **Error Handling** - Implement proper error handling for all API calls including auth errors
9. **Loading States** - Add loading indicators for async operations
10. **Subscription Management** - Handle feature limitations based on subscription plans

## 📋 Complete API Endpoint Reference

### 🚨 IMPORTANT: Authentication Required

**ALL endpoints except the following require JWT authentication:**

- `POST /api/organizations` (organization signup)
- `POST /api/auth/login`
- `GET /api/health`
- `GET /api` (API info)

**Authentication Header Required:**

```
Authorization: Bearer {jwt-token}
```

**Organization Context:**
Access via subdomain (`acme.namespinner.com`) or include header:

```
X-Organization-Slug: {org-slug}
```

### 🏢 Authentication & Organization Management

#### Organization Signup

```
POST /api/organizations
Request Body: {
  organizationName: string (required),
  organizationSlug: string (required), // URL-friendly identifier
  organizationDomain?: string, // custom domain
  organizationIndustry?: 'technology' | 'healthcare' | 'finance' | 'education' | 'retail' | 'manufacturing' | 'consulting' | 'other',
  organizationSize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise',
  userName: string (required),
  userEmail: string (required),
  userPassword: string (required),
  subscriptionPlan?: 'free' | 'basic' | 'pro' | 'enterprise'
}
Response: {
  message: string,
  organization: {
    id: string,
    name: string,
    slug: string,
    subscription: {
      plan: string,
      status: string,
      maxUsers: number,
      features: string[]
    }
  },
  user: {
    id: string,
    name: string,
    email: string,
    role: string
  },
  token: string // JWT token
}
```

#### User Login

```
POST /api/auth/login
Request Body: {
  email: string (required),
  password: string (required),
  organizationSlug?: string // optional if using subdomain
}
Response: {
  message: string,
  token: string, // JWT token
  user: {
    id: string,
    name: string,
    email: string,
    role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer',
    permissions: {
      canCreateMeetings: boolean,
      canManageTeams: boolean,
      canViewAnalytics: boolean,
      canExportData: boolean,
      canManageUsers: boolean,
      canManageOrganization: boolean
    }
  },
  organization: {
    id: string,
    name: string,
    slug: string,
    subscription: {
      plan: string,
      status: string,
      maxUsers: number,
      features: string[]
    }
  }
}
```

#### Get Current User Profile

```
GET /api/auth/profile
Headers: Authorization: Bearer {token}
Response: {
  user: {
    id: string,
    name: string,
    email: string,
    department?: string,
    role?: string,
    organizationRole: 'owner' | 'admin' | 'manager' | 'member' | 'viewer',
    avatarUrl?: string,
    permissions: object,
    settings: object,
    lastLogin?: string,
    createdAt: string
  },
  organization: object
}
```

#### Update User Profile

```
PUT /api/auth/profile
Headers: Authorization: Bearer {token}
Request Body: {
  name?: string,
  department?: string,
  role?: string,
  avatarUrl?: string,
  settings?: object
}
```

#### Change Password

```
POST /api/auth/change-password
Headers: Authorization: Bearer {token}
Request Body: {
  currentPassword: string (required),
  newPassword: string (required, min 8 chars)
}
```

#### Get Current Organization

```
GET /api/organization
Headers: Authorization: Bearer {token}
Response: {
  organization: {
    id: string,
    name: string,
    slug: string,
    domain?: string,
    description?: string,
    industry?: string,
    size: string,
    logo?: string,
    settings: object,
    subscription: {
      plan: string,
      status: string,
      maxUsers: number,
      features: string[]
    },
    security: object,
    userCount: number,
    createdAt: string,
    updatedAt: string
  }
}
```

#### Update Organization (Admin+ required)

```
PUT /api/organization
Headers: Authorization: Bearer {token}
Request Body: {
  name?: string,
  description?: string,
  industry?: string,
  domain?: string,
  logo?: string,
  settings?: object,
  security?: object
}
```

#### Get Organization Users (Manage Users permission required)

```
GET /api/organization/users
Headers: Authorization: Bearer {token}
Response: {
  users: Array<{
    id: string,
    name: string,
    email: string,
    department?: string,
    role?: string,
    organizationRole: string,
    isActive: boolean,
    lastLogin?: string,
    permissions: object,
    createdAt: string
  }>
}
```

#### Invite User (Manage Users permission required)

```
POST /api/organization/invite
Headers: Authorization: Bearer {token}
Request Body: {
  email: string (required),
  name: string (required),
  role?: string,
  organizationRole?: 'admin' | 'manager' | 'member' | 'viewer',
  permissions?: object
}
```

### 🏠 System Endpoints

#### Health Check

```
GET /api/health
Response: {
  status: 'healthy',
  timestamp: string,
  uptime: number,
  version: '2.0.0-enterprise-multitenant',
  features: {
    multiTenant: boolean,
    authentication: boolean,
    roleBasedAccess: boolean,
    enterpriseFeatures: boolean
  }
}
```

#### API Information

```
GET /api
Response: {
  name: string,
  version: string,
  description: string,
  endpoints: object,
  features: string[],
  multiTenant: {
    accessMethods: string[],
    authRequired: boolean,
    subscriptionPlans: string[]
  }
}
```

### 💰 Subscription Plans & Features

| Plan           | Max Users | Features                       | Monthly Price |
| -------------- | --------- | ------------------------------ | ------------- |
| **Free**       | 5         | Basic analytics, Export        | $0            |
| **Basic**      | 25        | + Teams, Advanced settings     | $9            |
| **Pro**        | 100       | + Advanced analytics, Branding | $29           |
| **Enterprise** | 1000      | + API access, SSO              | $99           |

**Feature Codes:**

- `basicAnalytics` - Dashboard stats and basic reports
- `export` - Data export functionality
- `teams` - Team management features
- `advancedSettings` - Advanced meeting settings
- `advancedAnalytics` - Detailed analytics and insights
- `customBranding` - Custom logo and branding
- `apiAccess` - Full API access
- `sso` - Single Sign-On integration

### 📊 Dashboard Endpoints

#### Get Dashboard Statistics

```
GET /api/dashboard/stats
Query Parameters: None
Response: {
  totalMeetings: number,
  totalParticipants: number,
  totalSelections: number,
  activeMeetings: number,
  avgParticipantsPerMeeting: number,
  totalTeams: number,
  departmentStats: Array<{
    department: string,
    participantCount: number,
    selectionCount: number
  }>,
  recentActivityCount: number,
  growthMetrics: {
    meetingsGrowth: string,
    participantsGrowth: string,
    selectionsGrowth: string
  }
}
```

#### Get Recent Meetings

```
GET /api/dashboard/recent-meetings?limit=5
Query Parameters:
  - limit (optional): number (default: 5)
Response: {
  meetings: Array<{
    _id: string,
    name: string,
    department: string,
    participantCount: number,
    totalSpins: number,
    lastActivity: string,
    status: 'active' | 'scheduled' | 'completed' | 'archived',
    createdAt: string
  }>
}
```

#### Get Top Participants

```
GET /api/dashboard/top-participants?limit=10
Query Parameters:
  - limit (optional): number (default: 10)
Response: {
  participants: Array<{
    _id: string,
    name: string,
    department: string,
    selectionCount: number,
    totalMeetings: number,
    lastSelected: string
  }>
}
```

### 📈 Analytics Endpoints

#### Analytics Overview

```
GET /api/analytics/overview
Response: {
  totalMeetings: number,
  totalParticipants: number,
  totalSelections: number,
  avgSelectionsPerMeeting: number,
  mostActiveDepartment: string,
  recentGrowth: {
    meetings: string,
    participants: string,
    selections: string
  }
}
```

#### Weekly Activity

```
GET /api/analytics/weekly-activity
Response: {
  weeklyData: Array<{
    date: string,
    meetings: number,
    selections: number,
    participants: number
  }>
}
```

#### Department Performance

```
GET /api/analytics/department-performance
Response: {
  departments: Array<{
    department: string,
    participantCount: number,
    selectionCount: number,
    meetingCount: number,
    avgSelectionsPerParticipant: number,
    lastActivity: string
  }>
}
```

#### Selection Fairness

```
GET /api/analytics/selection-fairness
Response: {
  fairnessScore: number,
  participantFairness: Array<{
    participantId: string,
    name: string,
    department: string,
    selectionCount: number,
    expectedSelections: number,
    fairnessRatio: number
  }>,
  departmentFairness: Array<{
    department: string,
    totalParticipants: number,
    totalSelections: number,
    averageSelections: number,
    fairnessScore: number
  }>
}
```

#### Peak Hours Analysis

```
GET /api/analytics/peak-hours
Response: {
  hourlyData: Array<{
    hour: number,
    count: number,
    percentage: number
  }>,
  peakHour: number,
  peakCount: number
}
```

#### Engagement Score

```
GET /api/analytics/engagement-score
Response: {
  overall: number,
  byDepartment: Array<{
    department: string,
    score: number,
    participantCount: number,
    activeParticipants: number
  }>,
  trends: Array<{
    date: string,
    score: number
  }>
}
```

### 👥 Teams Management

#### Get All Teams

```
GET /api/teams
Response: {
  teams: Array<{
    id: string,
    name: string,
    description: string,
    members: number,
    activeMeetings: number,
    totalSelections: number,
    growth: string,
    color: string,
    lead: {
      id: string,
      name: string,
      email: string
    } | null,
    lastActivity: string,
    createdAt: string,
    updatedAt: string
  }>
}
```

#### Create Team

```
POST /api/teams
Request Body: {
  name: string (required),
  description?: string,
  color?: string,
  leadId?: string
}
Response: {
  message: string,
  team: TeamObject
}
```

#### Get Team by ID

```
GET /api/teams/:id
Response: {
  id: string,
  name: string,
  description: string,
  color: string,
  lead: LeadObject | null,
  members: Array<{
    id: string,
    name: string,
    email: string,
    department: string,
    role: string,
    joinedAt: string
  }>,
  activeMeetings: number,
  totalSelections: number,
  createdAt: string,
  updatedAt: string
}
```

#### Update Team

```
PUT /api/teams/:id
Request Body: {
  name?: string,
  description?: string,
  color?: string,
  leadId?: string
}
Response: {
  message: string,
  team: TeamObject
}
```

#### Delete Team

```
DELETE /api/teams/:id
Response: {
  message: string
}
```

#### Get Team Members

```
GET /api/teams/:id/members
Response: {
  members: Array<MemberObject>
}
```

#### Add Team Member

```
POST /api/teams/:id/members
Request Body: {
  participantId: string (required),
  role?: string
}
Response: {
  message: string,
  member: MemberObject
}
```

#### Remove Team Member

```
DELETE /api/teams/:id/members/:memberId
Response: {
  message: string
}
```

#### Get Team Performance

```
GET /api/teams/:id/performance
Response: {
  metrics: {
    totalMeetings: number,
    totalSelections: number,
    avgSelectionsPerMember: number,
    activeMembers: number,
    recentActivity: number
  },
  memberPerformance: Array<{
    participantId: string,
    name: string,
    selectionCount: number,
    meetingCount: number,
    lastSelected: string
  }>,
  timeline: Array<{
    date: string,
    selections: number,
    meetings: number
  }>
}
```

### 📤 Export Endpoints

#### Create Export Jobs

```
POST /api/export/meeting/:id
POST /api/export/analytics
POST /api/export/participants
POST /api/export/teams

Request Body: {
  format: 'json' | 'csv' | 'excel',
  filters?: {
    startDate?: string,
    endDate?: string,
    department?: string,
    teamId?: string
  }
}
Response: {
  exportId: string,
  status: 'pending',
  estimatedTime: string,
  downloadUrl: string (when ready)
}
```

#### Get Export Status

```
GET /api/export/status/:exportId
Response: {
  exportId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,
  fileName?: string,
  downloadUrl?: string,
  error?: string,
  createdAt: string,
  completedAt?: string
}
```

#### Download Export File

```
GET /api/export/download/:fileName
Response: File download (JSON/CSV/Excel)
```

### 🏢 Enhanced Meetings

#### Get All Meetings

```
GET /api/meetings
Response: Array<{
  _id: string,
  name: string,
  department: string,
  description: string,
  isActive: boolean,
  status: 'active' | 'scheduled' | 'completed' | 'archived',
  teamId?: string,
  participants: Array<ParticipantObject>,
  settings: {
    spinDuration: number,
    excludeRecentlySelected: boolean,
    allowManualSelection: boolean,
    maxSelectionsPerSession?: number,
    selectionMethod: 'random' | 'weighted' | 'manual'
  },
  statistics: {
    totalSpins: number,
    totalParticipants: number,
    lastActivity?: string,
    averageSpinDuration?: number
  },
  createdAt: string,
  updatedAt: string
}>
```

#### Create Meeting

```
POST /api/meetings
Request Body: {
  name: string (required),
  department: string (required),
  description?: string,
  teamId?: string,
  settings?: {
    spinDuration?: number,
    excludeRecentlySelected?: boolean,
    allowManualSelection?: boolean,
    maxSelectionsPerSession?: number,
    selectionMethod?: 'random' | 'weighted' | 'manual'
  }
}
```

#### Add Participants to Meeting

```
POST /api/meetings/:meetingId/add-participants
Content-Type: multipart/form-data
Body: FormData with 'file' (CSV/Excel file)
```

### 👤 Enhanced Participants

#### Get All Participants

```
GET /api/participants
Response: Array<{
  _id: string,
  name: string,
  role?: string,
  email?: string,
  department: string,
  lastSelected?: string,
  selectionCount: number,
  meetingId?: string,
  teamId?: string,
  isActive: boolean,
  avatar?: string,
  totalMeetings: number,
  metadata?: object,
  createdAt: string,
  updatedAt: string
}>
```

#### Create Participants (Batch)

```
POST /api/participants/batch
Request Body: {
  participants: Array<{
    name: string,
    department: string,
    role?: string,
    email?: string,
    meetingId?: string,
    teamId?: string
  }>
}
```

### 📜 Enhanced Selection History

#### Get Selection History

```
GET /api/history
Response: Array<{
  _id: string,
  meetingId: string,
  participantId: string,
  participantName: string,
  department: string,
  teamId?: string,
  selectionDuration?: number,
  sessionId?: string,
  selectionMethod: 'random' | 'weighted' | 'manual',
  metadata?: object,
  selectedAt: string,
  createdAt: string
}>
```

#### Create Selection Record

```
POST /api/history
Request Body: {
  meetingId: string,
  participantId: string,
  participantName: string,
  department: string,
  teamId?: string,
  selectionDuration?: number,
  sessionId?: string,
  selectionMethod?: 'random' | 'weighted' | 'manual',
  metadata?: object
}
```

#### Select Participant (Enhanced)

```
POST /api/history/select
Request Body: {
  meetingId: string,
  sessionId?: string,
  selectionMethod?: 'random' | 'weighted' | 'manual',
  excludeRecentlySelected?: boolean
}
Response: {
  selectedParticipant: {
    _id: string,
    name: string,
    department: string,
    selectionCount: number,
    lastSelected: string
  },
  selectionRecord: {
    _id: string,
    selectionDuration: number,
    selectedAt: string,
    metadata: object
  },
  meetingStats: {
    totalSpins: number,
    totalParticipants: number
  }
}
```

## 🎨 Frontend Implementation Guidelines

### 1. TypeScript Interfaces

Create these interfaces in your frontend:

```typescript
// Authentication & Organization Types
interface AuthUser {
  id: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  organizationRole: "owner" | "admin" | "manager" | "member" | "viewer";
  avatarUrl?: string;
  permissions: UserPermissions;
  settings: UserSettings;
  lastLogin?: string;
  createdAt: string;
}

interface UserPermissions {
  canCreateMeetings: boolean;
  canManageTeams: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canManageOrganization: boolean;
}

interface UserSettings {
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    meetingReminders: boolean;
    weeklyReports: boolean;
  };
  preferences: {
    darkMode: boolean;
    autoSave: boolean;
    showAnimations: boolean;
    compactView: boolean;
    defaultSpinDuration: number;
    defaultExcludeRecent: boolean;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  description?: string;
  industry?: string;
  size: "startup" | "small" | "medium" | "large" | "enterprise";
  logo?: string;
  subscription: {
    plan: "free" | "basic" | "pro" | "enterprise";
    status: "active" | "suspended" | "cancelled" | "trial";
    maxUsers: number;
    features: string[];
    endDate?: string;
  };
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface LoginRequest {
  email: string;
  password: string;
  organizationSlug?: string;
}

interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
  organization: Organization;
}

interface SignupRequest {
  organizationName: string;
  organizationSlug: string;
  organizationDomain?: string;
  organizationIndustry?: string;
  organizationSize: string;
  userName: string;
  userEmail: string;
  userPassword: string;
  subscriptionPlan?: string;
}

// Core Types (updated for multi-tenancy)
interface Meeting {
  _id: string;
  organizationId: string; // NEW
  name: string;
  department: string;
  description?: string;
  isActive: boolean;
  status: "active" | "scheduled" | "completed" | "archived";
  teamId?: string;
  participants: Participant[];
  settings: MeetingSettings;
  statistics: MeetingStatistics;
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  _id: string;
  organizationId: string; // NEW
  name: string;
  role?: string;
  email?: string;
  department: string;
  lastSelected?: string;
  selectionCount: number;
  meetingId?: string;
  teamId?: string;
  isActive: boolean;
  avatar?: string;
  totalMeetings: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: string;
  organizationId: string; // NEW
  name: string;
  description?: string;
  members: number;
  activeMeetings: number;
  totalSelections: number;
  growth: string;
  color: string;
  lead?: {
    id: string;
    name: string;
    email: string;
  };
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

// ... (keep existing interfaces and add organizationId where applicable)
```

### 2. API Service Layer

Create a comprehensive API service with authentication:

```typescript
class APIService {
  private baseURL: string;
  private authToken: string | null = null;
  private organization: Organization | null = null;

  constructor(organizationSlug?: string) {
    // Support both subdomain and explicit org slug
    if (organizationSlug) {
      this.baseURL = `https://${organizationSlug}.namespinner.com/api`;
    } else if (window.location.hostname.includes(".namespinner.com")) {
      this.baseURL = `https://${window.location.hostname}/api`;
    } else {
      this.baseURL = "http://localhost:5000/api";
    }

    // Load stored auth data
    this.loadAuthData();
  }

  // Authentication methods
  async signup(data: SignupRequest): Promise<LoginResponse> {
    const response = await this.request("/organizations", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.token) {
      this.setAuthData(response.token, response.user, response.organization);
    }

    return response;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (response.token) {
      this.setAuthData(response.token, response.user, response.organization);
    }

    return response;
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", { method: "POST" });
    this.clearAuthData();
  }

  async getProfile(): Promise<{ user: AuthUser; organization: Organization }> {
    return this.request("/auth/profile");
  }

  async updateProfile(data: Partial<AuthUser>): Promise<{ user: AuthUser }> {
    return this.request("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    return this.request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Organization methods
  async getCurrentOrganization(): Promise<{ organization: Organization }> {
    return this.request("/organization");
  }

  async updateOrganization(
    data: Partial<Organization>
  ): Promise<{ organization: Organization }> {
    return this.request("/organization", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getOrganizationUsers(): Promise<{ users: AuthUser[] }> {
    return this.request("/organization/users");
  }

  async inviteUser(data: {
    email: string;
    name: string;
    role?: string;
    organizationRole?: string;
    permissions?: UserPermissions;
  }): Promise<{ user: AuthUser }> {
    return this.request("/organization/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Dashboard APIs (now require auth)
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request("/dashboard/stats");
  }

  async getRecentMeetings(limit = 5): Promise<{ meetings: Meeting[] }> {
    return this.request(`/dashboard/recent-meetings?limit=${limit}`);
  }

  // Analytics APIs (now require canViewAnalytics permission)
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    return this.request("/analytics/overview");
  }

  // Teams APIs (now require auth)
  async getAllTeams(): Promise<{ teams: Team[] }> {
    return this.request("/teams");
  }

  async createTeam(team: CreateTeamRequest): Promise<{ team: Team }> {
    return this.request("/teams", {
      method: "POST",
      body: JSON.stringify(team),
    });
  }

  // Export APIs (now require canExportData permission)
  async createExportJob(
    type: string,
    format: string,
    filters?: any
  ): Promise<{ exportId: string }> {
    return this.request(`/export/${type}`, {
      method: "POST",
      body: JSON.stringify({ format, filters }),
    });
  }

  // Enhanced selection with new metadata
  async selectParticipant(
    meetingId: string,
    options?: {
      sessionId?: string;
      selectionMethod?: "random" | "weighted" | "manual";
      excludeRecentlySelected?: boolean;
    }
  ) {
    return this.request("/history/select", {
      method: "POST",
      body: JSON.stringify({ meetingId, ...options }),
    });
  }

  // Permission checking utilities
  hasPermission(permission: keyof UserPermissions): boolean {
    const user = this.getCurrentUser();
    return user?.permissions[permission] || false;
  }

  hasRole(
    minRole: "viewer" | "member" | "manager" | "admin" | "owner"
  ): boolean {
    const user = this.getCurrentUser();
    const roleHierarchy = ["viewer", "member", "manager", "admin", "owner"];
    const userRoleIndex = roleHierarchy.indexOf(
      user?.organizationRole || "viewer"
    );
    const minRoleIndex = roleHierarchy.indexOf(minRole);
    return userRoleIndex >= minRoleIndex;
  }

  hasFeature(feature: string): boolean {
    return this.organization?.subscription.features.includes(feature) || false;
  }

  // Private utility methods
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add authentication header if available
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    // Add organization header if not using subdomain
    if (
      !window.location.hostname.includes(".namespinner.com") &&
      this.organization
    ) {
      headers["X-Organization-Slug"] = this.organization.slug;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Request failed",
        message: response.statusText,
      }));

      // Handle auth errors
      if (response.status === 401) {
        this.clearAuthData();
        window.location.href = "/login";
      }

      throw new Error(error.message || error.error || "Request failed");
    }

    return response.json();
  }

  private setAuthData(
    token: string,
    user: AuthUser,
    organization: Organization
  ): void {
    this.authToken = token;
    this.organization = organization;

    localStorage.setItem("authToken", token);
    localStorage.setItem("currentUser", JSON.stringify(user));
    localStorage.setItem("organization", JSON.stringify(organization));
  }

  private loadAuthData(): void {
    this.authToken = localStorage.getItem("authToken");
    const orgData = localStorage.getItem("organization");
    this.organization = orgData ? JSON.parse(orgData) : null;
  }

  private clearAuthData(): void {
    this.authToken = null;
    this.organization = null;

    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("organization");
  }

  public getCurrentUser(): AuthUser | null {
    const userData = localStorage.getItem("currentUser");
    return userData ? JSON.parse(userData) : null;
  }

  public isAuthenticated(): boolean {
    return !!this.authToken && !!this.organization;
  }
}
```

### 3. New Components to Create

1. **Authentication System**

   - LoginForm - Handle organization login
   - SignupForm - Organization and user registration
   - AuthGuard - Protect routes requiring authentication
   - PermissionGuard - Show/hide features based on permissions

2. **Organization Management**

   - OrganizationSettings - Manage org details and settings
   - UserManagement - List, invite, and manage users
   - SubscriptionManager - Display plan and usage limits
   - BillingInfo - Handle subscription billing

3. **Enhanced Dashboard**

   - Overview with org-specific statistics
   - Permission-based feature visibility
   - Subscription limit warnings

4. **Role-Based UI Components**

   - PermissionWrapper - Conditionally render based on permissions
   - RoleBasedNavigation - Show nav items based on role
   - FeatureGate - Check subscription features

5. **Existing Enhanced Components**
   - Analytics Dashboard - Show detailed analytics with charts
   - Teams Management - CRUD operations for teams
   - Export Center - Handle data exports with progress tracking
   - Enhanced Meeting Settings - New configuration options

### 4. Key Integration Points

1. **Implement Authentication Flow**

   ```typescript
   // App initialization
   const api = new APIService();

   // Check authentication on app load
   if (api.isAuthenticated()) {
     // Load user data and organization
     const { user, organization } = await api.getProfile();
     setCurrentUser(user);
     setOrganization(organization);
   } else {
     // Redirect to login
     navigate("/login");
   }
   ```

2. **Organization-based Routing**

   ```typescript
   // Route structure
   /{org-slug}/dashboard
   /{org-slug}/meetings
   /{org-slug}/analytics
   /{org-slug}/teams
   /{org-slug}/settings

   // Or use subdomain detection
   if (window.location.hostname.includes('.namespinner.com')) {
     const orgSlug = window.location.hostname.split('.')[0];
     // Initialize API with org context
   }
   ```

3. **Permission-Based Feature Display**

   ```typescript
   // Example: Analytics link only for users with permission
   {
     api.hasPermission("canViewAnalytics") && (
       <NavLink to="/analytics">Analytics</NavLink>
     );
   }

   // Example: Export button only if user can export AND org has feature
   {
     api.hasPermission("canExportData") && api.hasFeature("export") && (
       <ExportButton />
     );
   }
   ```

4. **Subscription Limit Handling**

   ```typescript
   // Check limits before actions
   if (organization.userCount >= organization.subscription.maxUsers) {
     showUpgradeModal("You have reached your user limit");
     return;
   }

   // Feature gates
   if (!api.hasFeature("advancedAnalytics")) {
     return <UpgradePrompt feature="Advanced Analytics" />;
   }
   ```

5. **Error Handling for Multi-Tenancy**
   ```typescript
   // Handle different error types
   try {
     await api.getDashboardStats();
   } catch (error) {
     if (error.message.includes("Organization not found")) {
       navigate("/organization-not-found");
     } else if (error.message.includes("Subscription inactive")) {
       navigate("/subscription-expired");
     } else if (error.message.includes("Insufficient permissions")) {
       showPermissionDeniedMessage();
     }
   }
   ```

### 5. Error Handling Pattern

```typescript
async function handleAPICall<T>(apiCall: () => Promise<T>): Promise<T | null> {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    console.error("API Error:", error);
    // Show user-friendly error message
    // Log error for debugging
    return null;
  }
}
```

### 6. Real-time Updates

Consider implementing polling or WebSocket connections for:

- Dashboard statistics updates
- Export job progress
- Live meeting activities
- Real-time analytics

## 🚀 Implementation Priority

### Phase 1: Authentication & Multi-Tenancy Foundation

1. **Setup Authentication System** - Login, signup, logout flows
2. **Organization Context** - Subdomain/domain-based routing
3. **API Service Layer** - JWT token management and org context
4. **Route Protection** - AuthGuard and permission checking
5. **Basic Organization Management** - Settings and user invitation

### Phase 2: Update Existing Features

1. **Update existing API calls** to include authentication headers
2. **Add permission checks** to existing features
3. **Integrate organization context** into meetings and participants
4. **Update data models** to handle new fields and structures

### Phase 3: Enhanced Dashboard & Analytics

1. **Organization Dashboard** - Overview with org-specific stats
2. **Role-based Navigation** - Show features based on permissions
3. **Analytics Integration** - Charts and metrics with permission gates
4. **Subscription Awareness** - Display limits and upgrade prompts

### Phase 4: Teams & Advanced Features

1. **Teams Management** - Full CRUD with organization isolation
2. **Export Functionality** - Permission and feature-gated exports
3. **Advanced Settings** - Organization and user preferences
4. **User Management** - Invite, manage, and organize users

### Phase 5: Enterprise Features & Polish

1. **Subscription Management** - Plan details and billing
2. **Advanced Analytics** - Feature-gated detailed insights
3. **Custom Branding** - Organization logos and themes
4. **Real-time Features** - Live updates and notifications

## 🧪 Testing the Integration

### Authentication Testing

```typescript
// Test login flow
const loginResult = await api.login({
  email: "test@acme.com",
  password: "password123",
  organizationSlug: "acme",
});

console.log("Login successful:", loginResult.token);
console.log("User role:", loginResult.user.organizationRole);
console.log("Permissions:", loginResult.user.permissions);
```

### Organization Context Testing

```typescript
// Test organization resolution
const org = await api.getCurrentOrganization();
console.log("Organization:", org.organization.name);
console.log("Plan:", org.organization.subscription.plan);
console.log("Features:", org.organization.subscription.features);
```

### Permission Testing

```typescript
// Test permission checks
console.log("Can view analytics:", api.hasPermission("canViewAnalytics"));
console.log("Can manage teams:", api.hasPermission("canManageTeams"));
console.log("Has advanced analytics:", api.hasFeature("advancedAnalytics"));
```

### API Endpoint Testing

Use these test scenarios to verify connectivity:

1. **Public Endpoints** (no auth required):

   - `GET /api/health` - Verify backend is running
   - `GET /api` - Get API information
   - `POST /api/organizations` - Test organization signup

2. **Authentication Endpoints**:

   - `POST /api/auth/login` - Test user login
   - `GET /api/auth/profile` - Test token validation

3. **Protected Endpoints** (require auth):
   - `GET /api/dashboard/stats` - Test dashboard integration
   - `GET /api/meetings` - Verify org-filtered meetings data
   - `GET /api/organization` - Test organization context

### Error Scenarios to Handle

1. **Invalid organization slug** - Show organization not found page
2. **Expired subscription** - Show subscription renewal prompt
3. **Insufficient permissions** - Show access denied message
4. **Network errors** - Show retry options
5. **Token expiration** - Automatic re-authentication

## 🎉 Multi-Tenant SaaS Features

The backend now supports full multi-tenancy with:

✅ **Complete Data Isolation** - Each organization's data is completely separated
✅ **Organization Management** - Create, update, and manage organizations  
✅ **User Authentication** - JWT-based auth with role-based access control
✅ **Subscription Management** - Different plans with feature limitations
✅ **Permission System** - Fine-grained access control for users
✅ **Migration Support** - Existing data migrated to multi-tenant structure

**The system is production-ready and includes all necessary security, performance, and scalability features for a modern SaaS application!** 🚀

Focus on implementing the authentication system first, then gradually add the enhanced enterprise features while maintaining the existing user experience.
