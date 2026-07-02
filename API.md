# API Documentation

Base URL: `http://localhost:4000/api/v1`

Interactive Swagger docs: `http://localhost:4000/api/docs`

## Authentication

All endpoints (except `/auth/*`) require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### POST /auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe" },
    "token": "jwt.token.here"
  }
}
```

**Errors:**
- `409 CONFLICT`: User already exists

---

### POST /auth/login

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe" },
    "token": "jwt.token.here"
  }
}
```

**Errors:**
- `401 UNAUTHORIZED`: Invalid credentials

---

## Project Endpoints

### POST /projects

Create a new project.

**Request Body:**
```json
{
  "name": "My App",
  "description": "Background job processing for my application"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My App",
    "description": "...",
    "userId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "_count": { "queues": 0, "workers": 0 }
  }
}
```

---

### GET /projects

List all projects for the authenticated user.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### GET /projects/:id

Get a single project by ID.

---

### DELETE /projects/:id

Delete a project and all associated data (cascading).

---

## Queue Endpoints

### POST /queues

Create a new queue.

**Request Body:**
```json
{
  "name": "email-notifications",
  "projectId": "uuid",
  "priority": 5,
  "concurrency": 10,
  "retryPolicyId": "uuid (optional)",
  "description": "Handles all email sending jobs"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "email-notifications",
    "projectId": "uuid",
    "priority": 5,
    "concurrency": 10,
    "status": "ACTIVE",
    "_count": { "jobs": 0 }
  }
}
```

---

### GET /queues

List queues for a project.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| projectId | uuid | Yes | Project to list queues for |
| page | int | No | Page number |
| limit | int | No | Items per page |

---

### GET /queues/:id

Get queue details.

---

### POST /queues/:id/pause

Pause a queue (workers stop claiming from it).

---

### POST /queues/:id/resume

Resume a paused queue.

---

### GET /queues/:id/stats

Get job status distribution for a queue.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "queueId": "uuid",
    "total": 150,
    "QUEUED": 10,
    "RUNNING": 5,
    "COMPLETED": 120,
    "FAILED": 8,
    "DEAD": 7
  }
}
```

---

## Job Endpoints

### POST /jobs

Create a new job.

**Request Body:**
```json
{
  "queueId": "uuid",
  "name": "send-welcome-email",
  "type": "IMMEDIATE",
  "payload": {
    "userId": "user-123",
    "template": "welcome"
  },
  "priority": 5,
  "maxAttempts": 3,
  "scheduledFor": "2024-06-01T10:00:00Z",
  "cronExpression": "0 */5 * * *",
  "batchId": "uuid",
  "idempotencyKey": "email-user123-welcome"
}
```

**Job Types:**
| Type | Description | Required Fields |
|------|-------------|-----------------|
| IMMEDIATE | Execute as soon as possible | - |
| DELAYED | Execute after a delay | scheduledFor |
| SCHEDULED | Execute at a specific time | scheduledFor |
| RECURRING | Execute on a cron schedule | cronExpression |
| BATCH | Part of a batch group | batchId |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "send-welcome-email",
    "type": "IMMEDIATE",
    "status": "QUEUED",
    "priority": 5,
    "attempts": 0,
    "maxAttempts": 3,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### GET /jobs

List jobs with filtering.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status (QUEUED, RUNNING, COMPLETED, FAILED, DEAD) |
| type | string | Filter by type (IMMEDIATE, DELAYED, SCHEDULED, RECURRING, BATCH) |
| queueId | uuid | Filter by queue |
| priority | int | Filter by priority |
| page | int | Page number |
| limit | int | Items per page |

---

### GET /jobs/:id

Get job details including execution history and logs.

---

### POST /jobs/:id/retry

Retry a failed or dead job. Resets the job to QUEUED status and removes it from the DLQ.

**Errors:**
- `400 VALIDATION_ERROR`: Job is not in a retryable state

---

### POST /jobs/:id/cancel

Cancel a pending or running job.

---

## Worker Endpoints

### GET /workers

List workers for a project.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| projectId | uuid | Yes | Project ID |
| page | int | No | Page number |
| limit | int | No | Items per page |

---

### GET /workers/stats

Get worker status aggregation.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "online": 3,
    "busy": 2,
    "idle": 1,
    "stale": 0,
    "offline": 1
  }
}
```

---

## Statistics Endpoint

### GET /stats

Get dashboard statistics for a project.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| projectId | uuid | Yes | Project ID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": {
      "total": 1500,
      "queued": 25,
      "running": 10,
      "completed": 1400,
      "failed": 50,
      "dead": 15
    },
    "workers": {
      "total": 5,
      "online": 4,
      "busy": 3
    },
    "queues": {
      "total": 8,
      "active": 6,
      "paused": 2
    },
    "throughput": {
      "last24h": 1200,
      "lastHour": 85
    }
  }
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": [...] // Optional, for validation errors
  }
}
```

**Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| UNAUTHORIZED | 401 | Missing or invalid auth token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## Rate Limiting

- 100 requests per 15-minute window per IP
- Returns `429 Too Many Requests` when exceeded
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
