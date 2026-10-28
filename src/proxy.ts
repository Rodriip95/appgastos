import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Chequeo optimista (solo presencia de cookie). La verificación real de la
// sesión ocurre en el DAL (`verifySession`), cerca de los datos. /login no se
// redirige aquí: una cookie vencida/inválida causaría un bucle con la home.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
