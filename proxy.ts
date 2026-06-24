import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Gates the dev-only /preview component gallery: in production it never reaches
 * the route — this returns a true 404 at the edge. In development it passes
 * through and the gallery renders. (page.tsx keeps a notFound() backstop.)
 */
export function proxy(req: NextRequest) {
    if (
        process.env.NODE_ENV === "production" &&
        req.nextUrl.pathname.startsWith("/preview")
    ) {
        return new NextResponse("Not found", { status: 404 });
    }
    return NextResponse.next();
}

export const config = {
    matcher: ["/preview", "/preview/:path*"],
};
