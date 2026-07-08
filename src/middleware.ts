import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { Role } from '@prisma/client'

const ROLE_ROUTES: Record<string, Role[]> = {
  '/patient':  ['PATIENT'],
  '/nurse':    ['NURSE'],
  '/doctor':   ['DOCTOR'],
  '/family':   ['FAMILY_MEMBER'],
  '/manager':  ['MANAGER'],
}

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname
    const role = (req.nextauth.token as any)?.role as Role | undefined

    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && role && !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/patient/:path*', '/nurse/:path*', '/doctor/:path*', '/family/:path*', '/manager/:path*'],
}
