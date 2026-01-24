# Frontend Serving Guide

## Development Mode

For development, use Vite's dev server:

```bash
npm run dev
```

This starts the development server at `http://localhost:3000` with hot module replacement.

## Production Build

### Build the Application

```bash
npm run build
```

This creates a production build in the `dist/` directory.

### Serve the Production Build

**Option 1: Use Vite Preview (Recommended)**

```bash
npm run preview
```

This uses Vite's built-in preview server which:
- Properly handles SPA routing (all routes fall back to `index.html`)
- Includes the API proxy configuration
- Runs on port 3000 by default

**Option 2: Use serve (Alternative)**

If you prefer using `serve`, make sure to:
1. Point to the correct directory (`dist`, not `build`)
2. Use the `-s` flag for SPA support

```bash
# Install serve globally (if not already installed)
npm install -g serve

# Serve the dist directory with SPA support
serve -s dist
```

**Option 3: Use a Custom Server**

You can also use any static file server, but make sure it:
- Serves files from the `dist/` directory
- Has SPA routing support (all routes fall back to `index.html`)
- Proxies `/api` requests to `http://localhost:8000`

## Important Notes

1. **Directory Name**: Vite builds to `dist/`, not `build/`
2. **SPA Routing**: All routes must fall back to `index.html` for client-side routing to work
3. **API Proxy**: The preview server includes API proxy configuration, but if using a different server, you'll need to configure it separately
4. **Backend Required**: The frontend needs the backend API running on port 8000

## Troubleshooting

### 404 Errors on Routes

If you see 404 errors when navigating to routes:
- Make sure you're using a server with SPA support
- Use `vite preview` or `serve -s dist`
- Check that `index.html` exists in the dist directory

### API Requests Failing

If API requests fail:
- Make sure the backend is running on port 8000
- Check that the proxy is configured correctly
- In production, you may need to configure CORS on the backend

### Build Not Found

If the build directory doesn't exist:
- Run `npm run build` first
- Check that the build completed successfully
- Verify the `dist/` directory was created
