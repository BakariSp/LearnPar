# Local Frontend Development with Remote Backend API

This guide explains how to run the frontend locally while connecting to the remote/production backend API.

## Why Use This Feature?

- Test your frontend code against real production data
- Debug frontend issues without having to set up the backend locally
- Ensure compatibility with the production API before deployment
- Work on frontend features when the local backend is unavailable or broken

## Setup

We've added a special development mode that allows you to connect to the remote API while running the frontend locally. This prevents the usual redirect to the production frontend.

### Prerequisites

- Node.js (version specified in package.json)
- npm
- Local clone of the frontend repository

### Environment Configuration

We've added a configuration in `.env.local` to control this feature:

```bash
# Production API URL for local testing with remote backend
NEXT_PUBLIC_API_URL=https://zero-ai-d9e8f5hgczgremge.westus-01.azurewebsites.net

# Set this to true to force the app to use local frontend even with production API
NEXT_PUBLIC_FORCE_LOCAL_FRONTEND=true
```

## Usage

### Using NPM Scripts

We've added convenient scripts to the `package.json` file:

1. To run with the **local backend**:

```bash
npm run dev:local-api
```

2. To run with the **remote backend**:

```bash
npm run dev:remote-api
```

3. For the default development mode (same as local backend):

```bash
npm run dev
```

### How It Works

When running with the remote backend (`dev:remote-api`):

1. The frontend sends a special HTTP header `X-Force-Local-Frontend: true` to the backend
2. The backend (if properly configured) will:
   - Skip redirects to the production frontend
   - Handle authentication callbacks to the local frontend
   - Ensure CORS allows requests from localhost

## Troubleshooting

### CORS Issues

If you see CORS errors in the browser console:

1. Ensure the backend has been updated to support this feature
2. Check that the backend's CORS configuration includes `http://localhost:3000`
3. Try using a CORS browser extension as a temporary workaround (for development only)

### Authentication Issues

If login or authentication doesn't work:

1. Clear your browser cookies and local storage
2. Make sure you're using the correct credentials for the environment
3. Check that the backend is respecting the `X-Force-Local-Frontend` header

### Redirects to Production

If you're still being redirected to the production frontend:

1. Verify that `NEXT_PUBLIC_FORCE_LOCAL_FRONTEND=true` is set
2. Check if the backend team has implemented the header recognition feature
3. Use the network tab in developer tools to confirm the header is being sent

## Best Practices

1. **Don't modify production data** when testing with the remote API
2. Create test accounts specifically for development
3. Be careful with operations that might impact real users
4. Toggle between local and remote APIs as needed for different testing scenarios

## Backend Documentation

For backend developers: see the [Backend Integration Guide](./backend-local-frontend-integration.md) for instructions on how to update the backend to support this feature. 