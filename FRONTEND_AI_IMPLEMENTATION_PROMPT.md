# Frontend AI Implementation Prompt: Multi-Tenant Name Spinner

## 🎯 Task Overview

Transform my existing Name Spinner frontend into a **multi-tenant SaaS application** that integrates with the new enterprise backend. The backend has been completely upgraded to support multiple organizations with full data isolation, JWT authentication, role-based permissions, and subscription management.

## 📋 What You Need to Implement

### 1. **Multi-Tenancy Architecture**

- Organization-based routing (subdomain or domain detection)
- Data isolation per organization
- Organization signup and management
- User authentication with organization context

### 2. **Authentication System**

- JWT-based login/logout
- Organization signup flow
- User profile management
- Password management
- Token refresh handling

### 3. **Role-Based Access Control**

- Permission-based feature visibility
- Subscription plan limitations
- User role management
- Admin features

### 4. **Enhanced Data Models**

- Updated TypeScript interfaces for all models
- Organization context in all API calls
- Multi-tenant data structures

## 🔐 Authentication Implementation

### Required Components:

1. **OrganizationSignup** - New organization registration
2. **Login** - User authentication with organization
3. **AuthProvider** - Context for authentication state
4. **ProtectedRoute** - Route protection wrapper
5. **AuthGuard** - Permission checking component

### Authentication Flow:

```typescript
// 1. Organization Signup
POST /api/organizations
{
  "organizationName": "Acme Corp",
  "organizationSlug": "acme",
  "organizationDomain": "acme.com", // optional
  "organizationIndustry": "Technology",
  "organizationSize": "50-100",
  "userName": "John Doe",
  "userEmail": "john@acme.com",
  "userPassword": "securePassword123",
  "subscriptionPlan": "pro" // free, basic, pro, enterprise
}

// Returns: { token, organization, user }

// 2. User Login
POST /api/auth/login
{
  "email": "john@acme.com",
  "password": "securePassword123",
  "organizationSlug": "acme" // optional if using subdomain
}

// Returns: { token, user, organization }
```

## 📊 Updated TypeScript Interfaces

```typescript
// Organization Interface
interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  description?: string;
  industry?: string;
  size?: string;
  logo?: string;
  settings: {
    timezone: string;
    defaultMeetingDuration: number;
    allowGuestParticipants: boolean;
    requireApproval: boolean;
    customBranding: boolean;
  };
  subscription: {
    plan: "free" | "basic" | "pro" | "enterprise";
    status: "active" | "trial" | "expired" | "cancelled";
    maxUsers: number;
    features: string[];
    startDate: string;
    endDate?: string;
  };
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

// Enhanced User Interface
interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  organizationRole: "owner" | "admin" | "manager" | "member" | "viewer";
  avatarUrl?: string;
  permissions: {
    canCreateMeetings: boolean;
    canManageTeams: boolean;
    canViewAnalytics: boolean;
    canExportData: boolean;
    canManageUsers: boolean;
    canManageOrganization: boolean;
  };
  settings: {
    theme: "light" | "dark";
    notifications: boolean;
    language: string;
  };
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// Enhanced Meeting Interface
interface Meeting {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  teamId?: string;
  createdBy: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  settings: {
    isRecurring: boolean;
    recurringPattern?: string;
    maxParticipants?: number;
    allowLateJoin: boolean;
    requireApproval: boolean;
  };
  participants: Participant[];
  selectionHistory: SelectionRecord[];
  analytics: {
    totalSelections: number;
    averageSelectionTime: number;
    participantEngagement: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Enhanced Participant Interface
interface Participant {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  department?: string;
  role?: string;
  teamId?: string;
  isActive: boolean;
  joinedAt?: string;
  metadata: {
    skills: string[];
    availability: string;
    preferences: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

// Team Interface
interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  members: string[];
  settings: {
    isPrivate: boolean;
    requireApproval: boolean;
    maxMembers?: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Selection Record Interface
interface SelectionRecord {
  id: string;
  organizationId: string;
  meetingId: string;
  participantId: string;
  selectionMethod: "random" | "weighted" | "round_robin" | "manual";
  selectedAt: string;
  selectionCriteria?: Record<string, any>;
  metadata: {
    duration: number;
    timestamp: string;
    selectedBy: string;
  };
}
```

## 🏗️ API Service Layer

Create a comprehensive API service with authentication and organization context:

```typescript
class ApiService {
  private baseURL: string;
  private token: string | null = null;
  private organization: Organization | null = null;

  constructor() {
    this.baseURL = this.getBaseURL();
    this.loadAuthState();
  }

  private getBaseURL(): string {
    // Extract organization from subdomain or use localhost
    const host = window.location.host;
    if (host.includes("localhost")) {
      return "http://localhost:5000/api";
    }
    return `https://${host}/api`;
  }

  private getAuthHeaders() {
    return {
      "Content-Type": "application/json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  // Authentication Methods
  async signup(signupData: OrganizationSignupData) {
    const response = await fetch(`${this.baseURL}/organizations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupData),
    });

    if (!response.ok) throw new Error("Signup failed");

    const data = await response.json();
    this.setAuthState(data.token, data.user, data.organization);
    return data;
  }

  async login(loginData: LoginData) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    });

    if (!response.ok) throw new Error("Login failed");

    const data = await response.json();
    this.setAuthState(data.token, data.user, data.organization);
    return data;
  }

  async logout() {
    await fetch(`${this.baseURL}/auth/logout`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
    this.clearAuthState();
  }

  // Organization Methods
  async getCurrentOrganization() {
    const response = await fetch(`${this.baseURL}/organization`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch organization");
    return response.json();
  }

  async updateOrganization(updateData: Partial<Organization>) {
    const response = await fetch(`${this.baseURL}/organization`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error("Failed to update organization");
    return response.json();
  }

  // User Management
  async getOrganizationUsers() {
    const response = await fetch(`${this.baseURL}/organization/users`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  }

  async inviteUser(userData: UserInviteData) {
    const response = await fetch(`${this.baseURL}/organization/invite`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error("Failed to invite user");
    return response.json();
  }

  // Enhanced Meeting Methods
  async getMeetings() {
    const response = await fetch(`${this.baseURL}/meetings`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch meetings");
    return response.json();
  }

  async createMeeting(meetingData: CreateMeetingData) {
    const response = await fetch(`${this.baseURL}/meetings`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(meetingData),
    });
    if (!response.ok) throw new Error("Failed to create meeting");
    return response.json();
  }

  // Dashboard & Analytics
  async getDashboardStats() {
    const response = await fetch(`${this.baseURL}/dashboard/stats`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch dashboard stats");
    return response.json();
  }

  async getAnalytics(timeframe: string) {
    const response = await fetch(
      `${this.baseURL}/analytics?timeframe=${timeframe}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to fetch analytics");
    return response.json();
  }

  // Permission & Feature Checks
  hasPermission(permission: string): boolean {
    return this.currentUser?.permissions?.[permission] || false;
  }

  hasFeature(feature: string): boolean {
    return (
      this.organization?.subscription?.features?.includes(feature) || false
    );
  }

  // Auth State Management
  private setAuthState(token: string, user: User, organization: Organization) {
    this.token = token;
    this.currentUser = user;
    this.organization = organization;
    localStorage.setItem("auth_token", token);
    localStorage.setItem("current_user", JSON.stringify(user));
    localStorage.setItem("organization", JSON.stringify(organization));
  }

  private clearAuthState() {
    this.token = null;
    this.currentUser = null;
    this.organization = null;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("current_user");
    localStorage.removeItem("organization");
  }

  private loadAuthState() {
    this.token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("current_user");
    const orgStr = localStorage.getItem("organization");

    if (userStr) this.currentUser = JSON.parse(userStr);
    if (orgStr) this.organization = JSON.parse(orgStr);
  }
}
```

## 🧩 Required Components

### 1. **AuthProvider Component**

```typescript
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Implement authentication context logic
  // Handle login, logout, token refresh
  // Provide user and organization state
};
```

### 2. **ProtectedRoute Component**

```typescript
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requirePermission?: string;
  requireFeature?: string;
}> = ({ children, requirePermission, requireFeature }) => {
  // Check authentication and permissions
  // Redirect to login if not authenticated
  // Show access denied if insufficient permissions
};
```

### 3. **Organization Dashboard**

```typescript
const OrganizationDashboard: React.FC = () => {
  // Display organization overview
  // Show key metrics and stats
  // Quick access to main features
  // User management panel for admins
};
```

## 🎨 Key Features to Implement

### 1. **Navigation Updates**

- Add organization branding (logo, name)
- Role-based menu items
- Subscription plan indicator
- User profile dropdown

### 2. **Permission-Based Features**

```typescript
// Example usage in components
{
  api.hasPermission("canManageTeams") && <TeamManagementPanel />;
}

{
  api.hasFeature("advancedAnalytics") && <AdvancedAnalyticsChart />;
}
```

### 3. **Subscription Awareness**

- Display current plan limits
- Show upgrade prompts when limits reached
- Feature gates for premium features

### 4. **Error Handling**

- Handle authentication errors (401)
- Handle permission errors (403)
- Handle subscription limit errors
- Token expiration handling

## 🚀 Implementation Priority

### Phase 1: Core Authentication (CRITICAL)

1. Implement ApiService with JWT authentication
2. Create AuthProvider and authentication context
3. Add login/logout functionality
4. Implement ProtectedRoute wrapper
5. Update all existing API calls to use authentication

### Phase 2: Multi-Tenancy (HIGH)

1. Add organization signup flow
2. Implement organization context
3. Update routing for organization-based access
4. Add organization management features

### Phase 3: Role-Based Access (HIGH)

1. Implement permission checking throughout app
2. Add role-based navigation
3. Create admin-only features
4. Handle subscription limitations

### Phase 4: Enhanced Features (MEDIUM)

1. Add dashboard with organization stats
2. Implement teams management
3. Add user management for admins
4. Create analytics views

### Phase 5: Polish & UX (LOW)

1. Add organization branding
2. Implement real-time updates
3. Add advanced error handling
4. Optimize performance

## 🧪 Testing Scenarios

1. **Organization Signup**: Test creating new organization with owner user
2. **User Login**: Test login with organization context
3. **Permission Checks**: Verify features show/hide based on roles
4. **Subscription Limits**: Test feature gates and upgrade prompts
5. **Multi-tenancy**: Ensure data isolation between organizations

## 📞 Backend API Base URL

- **Local Development**: `http://localhost:5000/api`
- **Production**: `https://{org-slug}.namespinner.com/api`

## 🎯 Success Criteria

✅ Users can create organizations and sign up
✅ Authentication works with JWT tokens
✅ All existing functionality continues to work
✅ Role-based access control is implemented
✅ Organization management is available
✅ Subscription awareness is built-in
✅ Multi-tenant data isolation is maintained
✅ Error handling covers all auth scenarios

## 💡 Implementation Notes

- **Maintain Backward Compatibility**: Existing features should continue working
- **Progressive Enhancement**: Add new features without breaking existing functionality
- **Security First**: Always validate permissions and handle auth errors
- **User Experience**: Smooth authentication flows with proper loading states
- **Organization Context**: Always include organization context in API calls

---

**The backend is fully implemented and tested. Focus on creating a seamless multi-tenant frontend experience that integrates with the new enterprise API while maintaining the existing user experience.**
