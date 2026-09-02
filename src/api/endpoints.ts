/**
 * Every API path the test suite touches, in one place.
 *
 * Tests and fixtures reference these constants rather than raw strings so a
 * backend route change is a one-line edit.
 */
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    session: '/auth/session',
  },
  users: {
    list: '/users',
    create: '/users',
    byId: (id: string): string => `/users/${id}`,
  },
  products: {
    list: '/products',
    byId: (id: string): string => `/products/${id}`,
  },
  orders: {
    list: '/orders',
    create: '/orders',
    byId: (id: string): string => `/orders/${id}`,
  },
} as const;
