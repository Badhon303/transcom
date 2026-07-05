import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Role-based route gating. Auth required for /dashboard and /admin.
export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const role = (token?.role as string) || "VIEWER";
    const path = req.nextUrl.pathname;

    // Transcom-only areas
    if (path.startsWith("/admin/customers") && role !== "TRANSCOM_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?denied=1", req.url));
    }
    // BPCL-only areas
    if (
      (path.startsWith("/admin/rbus") || path.startsWith("/admin/settings")) &&
      role !== "BPCL_ADMIN"
    ) {
      return NextResponse.redirect(new URL("/dashboard?denied=1", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
