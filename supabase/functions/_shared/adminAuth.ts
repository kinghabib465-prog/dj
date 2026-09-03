import { createClient } from "npm:@supabase/supabase-js@2";
import { supabase } from "./supabase.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

export type AdminAuthResult =
  | {
      ok: true;
      user: {
        id: string;
        email?: string;
      };
    }
  | {
      ok: false;
      response: Response;
    };

function jsonError(
  error: string,
  status: number
) {
  return new Response(
    JSON.stringify({ error }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

export async function requireAdmin(
  req: Request
): Promise<AdminAuthResult> {
  const authHeader =
    req.headers.get("Authorization");

  if (
    !authHeader?.startsWith("Bearer ")
  ) {
    return {
      ok: false,
      response: jsonError(
        "Missing auth",
        401
      ),
    };
  }

  const token = authHeader
    .slice("Bearer ".length)
    .trim();

  if (!token) {
    return {
      ok: false,
      response: jsonError(
        "Invalid token",
        401
      ),
    };
  }

  // Validate the JWT itself.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      response: jsonError(
        "Invalid token",
        401
      ),
    };
  }

  /*
   * IMPORTANT:
   * is_admin() must execute in the caller's JWT context.
   * Calling it with the service-role client would not represent
   * the actual authenticated user.
   */
  const userClient = createClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const {
    data: isAdmin,
    error: adminError,
  } = await userClient.rpc("is_admin");

  if (
    adminError ||
    isAdmin !== true
  ) {
    console.error(
      "Admin verification failed",
      {
        userId: user.id,
        code: adminError?.code,
        message: adminError?.message,
      }
    );

    return {
      ok: false,
      response: jsonError(
        "Not admin",
        403
      ),
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email:
        user.email ?? undefined,
    },
  };
}
