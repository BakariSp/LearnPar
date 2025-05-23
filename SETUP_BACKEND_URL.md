# Backend URL Setup

To enable direct backend API calls, create a `.env.local` file in the root of your project with the following content:

```bash
# Backend URL for direct API calls
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Backup URL for any remaining server-side calls
BACKEND_URL=http://localhost:8000
```

## What this does:

- **Eliminates the need for Next.js proxy routes** for most API calls
- **Calls your FastAPI backend directly** from the frontend
- **Simplifies the architecture** by removing unnecessary middleware
- **Keeps only essential Next.js routes** like `/api/planner/dialogue` that need special handling

## Benefits:

1. **Simpler architecture** - No need to create a Next.js route for every backend endpoint
2. **Better performance** - Direct calls without proxy overhead
3. **Easier debugging** - Clear separation between frontend and backend
4. **Less code to maintain** - Fewer files and less complexity

## What endpoints go where:

- **Direct to backend**: `/api/learning-paths/*`, `/api/tasks/*`, `/api/users/*`, etc.
- **Next.js routes**: `/api/planner/dialogue` (for special processing)

The `apiClient` function now automatically routes requests to the appropriate destination based on the endpoint path. 