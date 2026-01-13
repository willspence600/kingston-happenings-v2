# Testing Guide

This guide covers how to test the Kingston Happenings backend after the rebuild.

## Prerequisites

1. **Environment Variables**: Ensure your `.env.local` file is configured:
   ```bash
   DATABASE_URL="postgresql://..."
   DIRECT_URL="postgresql://..."
   NEXT_PUBLIC_SUPABASE_URL="https://..."
   NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
   SUPABASE_SERVICE_ROLE_KEY="..."
   ```

2. **Database**: Make sure your PostgreSQL database is accessible and migrations are applied:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

## Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 2. Verify Database Connection

```bash
# Open Prisma Studio to view your database
npm run db:studio
```

This opens a GUI at `http://localhost:5555` where you can browse tables and data.

## Testing API Endpoints

### Option 1: Using cURL (Command Line)

#### Test Public Endpoints (No Auth Required)

**Get All Events:**
```bash
curl http://localhost:3000/api/events
```

**Get Events with Filters:**
```bash
# Filter by date
curl "http://localhost:3000/api/events?date=2024-12-25"

# Filter by category
curl "http://localhost:3000/api/events?category=concert"

# Filter by venue
curl "http://localhost:3000/api/events?venueId=YOUR_VENUE_ID"
```

**Get All Venues:**
```bash
curl http://localhost:3000/api/venues
```

**Get Single Event:**
```bash
curl http://localhost:3000/api/events/EVENT_ID
```

**Get Single Venue:**
```bash
curl http://localhost:3000/api/venues/VENUE_ID
```

#### Test Authentication Endpoints

**Register a New User:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

**Get Current User:**
```bash
# First, login and save the session cookie, then:
curl http://localhost:3000/api/auth/me \
  --cookie "sb-access-token=YOUR_TOKEN"
```

#### Test Protected Endpoints (Requires Auth)

**Create an Event:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "Test Event",
    "description": "This is a test event",
    "date": "2024-12-25",
    "startTime": "19:00",
    "endTime": "22:00",
    "venueId": "YOUR_VENUE_ID",
    "categories": ["concert"],
    "price": "Free"
  }'
```

**Get My Submissions:**
```bash
curl http://localhost:3000/api/events/my-submissions \
  --cookie "sb-access-token=YOUR_TOKEN"
```

**Like an Event:**
```bash
curl -X POST http://localhost:3000/api/likes \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "eventId": "EVENT_ID"
  }'
```

**Update User Profile:**
```bash
curl -X PUT http://localhost:3000/api/user/update \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "name": "Updated Name"
  }'
```

#### Test Admin Endpoints (Requires Admin Role)

**Approve an Event:**
```bash
curl -X POST http://localhost:3000/api/events/EVENT_ID/approve \
  -H "Cookie: sb-access-token=ADMIN_TOKEN"
```

**Reject an Event:**
```bash
curl -X POST http://localhost:3000/api/events/EVENT_ID/reject \
  -H "Cookie: sb-access-token=ADMIN_TOKEN"
```

**Get Pending Events:**
```bash
curl "http://localhost:3000/api/events?status=pending" \
  -H "Cookie: sb-access-token=ADMIN_TOKEN"
```

### Option 2: Using Browser DevTools

1. Open your browser and navigate to `http://localhost:3000`
2. Open DevTools (F12) → Network tab
3. Perform actions in the UI and observe API calls
4. Check request/response details, status codes, and payloads

### Option 3: Using Postman or Insomnia

1. **Import Collection**: Create a new collection with these endpoints
2. **Set Base URL**: `http://localhost:3000`
3. **Configure Auth**: 
   - Type: Cookie-based
   - Cookie name: `sb-access-token`
   - Get token from login response

## Testing Validation

### Test Invalid Inputs

**Missing Required Fields:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "Test"
  }'
# Should return 400 with validation errors
```

**Invalid Date Format:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "Test Event",
    "description": "Test",
    "date": "invalid-date",
    "startTime": "19:00",
    "categories": ["concert"]
  }'
# Should return 400 with validation error
```

**Invalid URL:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "Test Event",
    "description": "Test",
    "date": "2024-12-25",
    "startTime": "19:00",
    "ticketUrl": "not-a-valid-url",
    "categories": ["concert"]
  }'
# Should return 400 with validation error
```

## Testing Error Handling

### Test Unauthorized Access

```bash
# Try to access protected route without auth
curl http://localhost:3000/api/events/my-submissions
# Should return 401 Unauthorized
```

### Test Forbidden Access

```bash
# Try to access admin route as regular user
curl -X POST http://localhost:3000/api/events/EVENT_ID/approve \
  -H "Cookie: sb-access-token=USER_TOKEN"
# Should return 403 Forbidden
```

### Test Not Found

```bash
# Try to get non-existent event
curl http://localhost:3000/api/events/non-existent-id
# Should return 404 Not Found
```

## Testing Service Layer

### Check Service Methods

All database operations should go through services. Verify by checking:

1. **No Direct Prisma Calls in Routes**: All API routes should import from `@/services/database`
2. **Error Types**: Errors should be service layer errors (NotFoundError, ValidationError, etc.)
3. **Type Safety**: All service methods should have proper TypeScript types

## Testing Database Operations

### Using Prisma Studio

```bash
npm run db:studio
```

This allows you to:
- View all tables and data
- Manually insert/update/delete records
- Verify relationships
- Check enum values

### Using Prisma CLI

```bash
# Check database connection
npx prisma db pull

# View migration status
npx prisma migrate status

# Generate Prisma Client
npx prisma generate
```

## Testing Authentication Flow

### Complete Auth Flow Test

1. **Register** → Should create user in Supabase
2. **Login** → Should return session token
3. **Get Current User** → Should return user profile
4. **Access Protected Route** → Should work with session
5. **Logout** → Should invalidate session
6. **Access Protected Route Again** → Should fail

## Testing Recurring Events

### Create Recurring Event

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "Weekly Trivia",
    "description": "Every Tuesday",
    "date": "2024-12-24",
    "startTime": "19:00",
    "isRecurring": true,
    "recurrencePattern": "weekly",
    "recurrenceEndDate": "2025-12-24",
    "venueId": "YOUR_VENUE_ID",
    "categories": ["trivia"]
  }'
```

This should create multiple event instances (one per week until end date).

## Testing Venue Creation

### Create Venue with Event

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "New Venue Event",
    "description": "Test",
    "date": "2024-12-25",
    "startTime": "19:00",
    "venueId": "new",
    "newVenueName": "Test Venue",
    "newVenueAddress": "123 Test St, Kingston, ON",
    "categories": ["concert"]
  }'
```

This should create both a new venue (pending approval) and the event.

## Monitoring & Debugging

### Check Server Logs

The development server logs all API requests and errors. Watch the terminal for:
- Request logs (method, path, user)
- Error logs (with stack traces in development)
- Validation errors

### Enable Debug Logging

In development mode, the error handler logs:
- Request details
- User ID
- Error messages
- Stack traces

## Common Issues & Solutions

### Issue: "Database connection failed"
**Solution**: Check `DATABASE_URL` and `DIRECT_URL` in `.env.local`

### Issue: "Unauthorized" errors
**Solution**: Make sure you're logged in and the session cookie is being sent

### Issue: "Validation failed" errors
**Solution**: Check the request body matches the schema (see validation schemas in `src/lib/validation/`)

### Issue: "Prisma Client not generated"
**Solution**: Run `npx prisma generate`

## Next Steps

1. **Integration Tests**: Consider adding automated tests with Jest/Vitest
2. **E2E Tests**: Use Playwright or Cypress for full user flows
3. **Load Testing**: Use tools like k6 or Artillery for performance testing
4. **API Documentation**: Consider adding OpenAPI/Swagger documentation
