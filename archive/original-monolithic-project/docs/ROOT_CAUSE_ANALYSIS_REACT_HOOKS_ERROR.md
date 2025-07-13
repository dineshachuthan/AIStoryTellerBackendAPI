# Root Cause Analysis: React Hooks Error - July 11, 2025

## Issue Summary
Persistent React hooks error: "Invalid hook call. Hooks can only be called inside of the body of a function component"

## Root Cause
1. **Browser Service Worker Caching**: The primary culprit was aggressive service worker caching that served old React code despite file changes
2. **Duplicate QueryClientProvider**: Two instances of QueryClientProvider were being created (one in main.tsx, one in App.tsx)
3. **Stale Browser Cache**: Browser continued serving cached version of React app even after code fixes

## How the Issue Was Resolved
1. Created cache clearing tool at `/public/clear-cache.html` to:
   - Unregister all service workers
   - Clear all browser caches
   - Clear localStorage and sessionStorage
2. Restructured React entry point:
   - Created `main-app.tsx` with single QueryClientProvider at root
   - Removed duplicate QueryClientProvider from App.tsx
   - Fixed all direct useToast violations (replaced with toast-utils.ts)

## Prevention Guidelines
1. **When React Hook Errors Persist After Code Fixes**:
   - First suspect browser caching issues
   - Clear service workers and caches before other debugging
   - Check for duplicate React context providers
   
2. **Architecture Rules to Follow**:
   - QueryClientProvider should only exist at the root level (main.tsx)
   - Never create nested QueryClientProviders
   - Always use toast-utils.ts instead of direct useToast() calls
   - Follow the zero tolerance policies in replit.md

3. **Cache Debugging Tools**:
   - Keep `/public/clear-cache.html` available for future cache issues
   - Use browser DevTools > Application > Clear Storage when needed
   - Force reload with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Key Lessons
- Browser caching can mask successful code fixes
- Service workers can serve stale code for extended periods
- Always verify cache state when React errors persist unexpectedly
- Duplicate context providers cause hooks to fail silently