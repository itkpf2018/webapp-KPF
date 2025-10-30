/**
 * Next.js Middleware
 * Protects routes based on authentication and role-based access control
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { UserRole } from '@/types/auth';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/verify'];

// Route role requirements
const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/': ['employee', 'sales', 'admin', 'super_admin'], // All authenticated users
  '/sales': ['employee', 'sales', 'admin', 'super_admin'],
  '/stock': ['employee', 'sales', 'admin', 'super_admin'],
  '/admin': ['sales', 'admin', 'super_admin'], // Admin dashboard accessible to sales and admin
  '/admin/reports': ['sales', 'admin', 'super_admin'],
  '/admin/settings': ['admin', 'super_admin'], // Settings only for admin
  '/admin/employees': ['admin', 'super_admin'],
  '/admin/stores': ['admin', 'super_admin'],
  '/admin/products': ['admin', 'super_admin'],
  '/admin/categories': ['admin', 'super_admin'],
  '/admin/product-assignments': ['admin', 'super_admin'],
  '/admin/leaves': ['admin', 'super_admin'],
  '/admin/logs': ['super_admin'], // Only super_admin can access logs
};

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  // Super Admin has access to EVERYTHING
  if (userRole === 'super_admin') return true;

  // Admin has access to everything except super_admin-only pages
  if (userRole === 'admin' && !requiredRoles.includes('super_admin')) return true;

  // Sales has access to employee pages
  if (userRole === 'sales' && requiredRoles.includes('employee')) return true;

  // Check exact match
  return requiredRoles.includes(userRole);
}

/**
 * Find matching route pattern
 */
function getRequiredRoles(pathname: string): UserRole[] | null {
  // Exact match
  if (ROUTE_ROLES[pathname]) {
    return ROUTE_ROLES[pathname];
  }

  // Prefix match (e.g., /admin/reports/attendance matches /admin/reports)
  for (const [route, roles] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(route + '/')) {
      return roles;
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next();
  }

  // Check authentication
  const sessionCookie = request.cookies.get('auth-session');
  const userCookie = request.cookies.get('auth-user');

  if (!sessionCookie || !userCookie) {
    // Not authenticated - redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Parse user data
  try {
    const user = JSON.parse(userCookie.value);
    const userRole = user.role as UserRole;

    // Special case: Allow all authenticated users to access /admin/settings?section=leaves
    if (pathname === '/admin/settings' && searchParams.get('section') === 'leaves') {
      return NextResponse.next();
    }

    // Get required roles for this route
    const requiredRoles = getRequiredRoles(pathname);

    if (requiredRoles && !hasRequiredRole(userRole, requiredRoles)) {
      // User doesn't have required role - redirect to home
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('[middleware] error parsing user:', error);
    // Invalid session - redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|maskable-icon.png).*)',
  ],
};
