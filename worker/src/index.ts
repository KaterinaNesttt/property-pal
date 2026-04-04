export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  CORS_ORIGIN?: string;
}

type UserRole = "superadmin" | "owner" | "tenant";

interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });

const error = (status: number, message: string, details?: string) => json({ error: message, details }, { status });
const encoder = new TextEncoder();

const base64UrlEncode = (value: ArrayBuffer | Uint8Array | string) => {
  const bytes =
    typeof value === "string"
      ? encoder.encode(value)
      : value instanceof Uint8Array
        ? value
        : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const getJwtSecret = (env: Env) => env.JWT_SECRET || "property-pal-dev-secret";

async function hashPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  return base64UrlEncode(digest);
}

async function signJwt(env: Env, payload: Record<string, unknown>) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = base64UrlEncode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getJwtSecret(env)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${claims}`));
  return `${header}.${claims}.${base64UrlEncode(signature)}`;
}

async function verifyJwt(env: Env, token: string) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getJwtSecret(env)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify("HMAC", key, base64UrlDecode(signature), encoder.encode(`${header}.${payload}`));
  if (!valid) {
    return null;
  }

  const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as SessionUser & { exp: number };
  if (claims.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return claims;
}

const parseBody = async <T>(request: Request) => (await request.json()) as T;
const nowIso = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

function corsHeaders(env: Env) {
  return {
    "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

async function requireUser(request: Request, env: Env, allowedRoles?: UserRole[]) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length);
  const session = await verifyJwt(env, token);
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  return session;
}

async function getTenantProfile(env: Env, userId: string) {
  return await env.DB.prepare("SELECT * FROM tenants WHERE user_id = ? LIMIT 1").bind(userId).first<Record<string, string>>();
}

async function getProperty(env: Env, propertyId: string) {
  return await env.DB.prepare("SELECT * FROM properties WHERE id = ? LIMIT 1").bind(propertyId).first<Record<string, string>>();
}

function paymentStatus(dueDate: string, paidAt: string | null) {
  if (paidAt) {
    return "paid";
  }
  return new Date(dueDate).getTime() < Date.now() ? "overdue" : "pending";
}

function taskStatus(dueDate: string, status: string) {
  if (status === "done") {
    return "done";
  }
  if (new Date(dueDate).getTime() < Date.now()) {
    return "overdue";
  }
  return status;
}

async function listProperties(env: Env, user: SessionUser) {
  if (user.role === "superadmin") {
    return await env.DB.prepare(
      `SELECT p.*, t.full_name AS tenant_name
       FROM properties p
       LEFT JOIN tenants t ON t.property_id = p.id AND t.is_active = 1
       ORDER BY p.created_at DESC`,
    ).all();
  }

  if (user.role === "tenant") {
    const tenant = await getTenantProfile(env, user.id);
    if (!tenant) {
      return { results: [] };
    }
    return await env.DB.prepare(
      `SELECT p.*, t.full_name AS tenant_name
       FROM properties p
       LEFT JOIN tenants t ON t.property_id = p.id AND t.is_active = 1
       WHERE p.id = ?
       ORDER BY p.created_at DESC`,
    )
      .bind(tenant.property_id)
      .all();
  }

  return await env.DB.prepare(
    `SELECT p.*, t.full_name AS tenant_name
     FROM properties p
     LEFT JOIN tenants t ON t.property_id = p.id AND t.is_active = 1
     WHERE p.owner_id = ?
     ORDER BY p.created_at DESC`,
  )
    .bind(user.id)
    .all();
}

async function listTenants(env: Env, user: SessionUser) {
  if (user.role === "tenant") {
    return await env.DB.prepare(
      `SELECT t.*, p.name AS property_name
       FROM tenants t
       JOIN properties p ON p.id = t.property_id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
    )
      .bind(user.id)
      .all();
  }

  if (user.role === "superadmin") {
    return await env.DB.prepare(
      `SELECT t.*, p.name AS property_name
       FROM tenants t
       JOIN properties p ON p.id = t.property_id
       ORDER BY t.created_at DESC`,
    ).all();
  }

  return await env.DB.prepare(
    `SELECT t.*, p.name AS property_name
     FROM tenants t
     JOIN properties p ON p.id = t.property_id
     WHERE t.owner_id = ?
     ORDER BY t.created_at DESC`,
  )
    .bind(user.id)
    .all();
}

async function listPayments(env: Env, user: SessionUser) {
  if (user.role === "tenant") {
    return await env.DB.prepare(
      `SELECT pay.*, p.name AS property_name, t.full_name AS tenant_name
       FROM payments pay
       JOIN properties p ON p.id = pay.property_id
       LEFT JOIN tenants t ON t.id = pay.tenant_id
       WHERE t.user_id = ?
       ORDER BY pay.created_at DESC`,
    )
      .bind(user.id)
      .all();
  }

  const where = user.role === "superadmin" ? "" : "WHERE p.owner_id = ?";
  const statement = env.DB.prepare(
    `SELECT pay.*, p.name AS property_name, t.full_name AS tenant_name
     FROM payments pay
     JOIN properties p ON p.id = pay.property_id
     LEFT JOIN tenants t ON t.id = pay.tenant_id
     ${where}
     ORDER BY pay.created_at DESC`,
  );
  return user.role === "superadmin" ? statement.all() : statement.bind(user.id).all();
}

async function listMeters(env: Env, user: SessionUser) {
  if (user.role === "tenant") {
    const tenant = await getTenantProfile(env, user.id);
    if (!tenant) {
      return { results: [] };
    }
    return await env.DB.prepare(
      `SELECT m.*, p.name AS property_name
       FROM meters m
       JOIN properties p ON p.id = m.property_id
       WHERE m.property_id = ?
       ORDER BY m.reading_date DESC`,
    )
      .bind(tenant.property_id)
      .all();
  }

  const where = user.role === "superadmin" ? "" : "WHERE p.owner_id = ?";
  const statement = env.DB.prepare(
    `SELECT m.*, p.name AS property_name
     FROM meters m
     JOIN properties p ON p.id = m.property_id
     ${where}
     ORDER BY m.reading_date DESC`,
  );
  return user.role === "superadmin" ? statement.all() : statement.bind(user.id).all();
}

async function listTasks(env: Env, user: SessionUser) {
  if (user.role === "tenant") {
    return await env.DB.prepare(
      `SELECT task.*, p.name AS property_name, t.full_name AS tenant_name
       FROM tasks task
       JOIN properties p ON p.id = task.property_id
       LEFT JOIN tenants t ON t.id = task.tenant_id
       WHERE t.user_id = ?
       ORDER BY task.created_at DESC`,
    )
      .bind(user.id)
      .all();
  }

  const where = user.role === "superadmin" ? "" : "WHERE p.owner_id = ?";
  const statement = env.DB.prepare(
    `SELECT task.*, p.name AS property_name, t.full_name AS tenant_name
     FROM tasks task
     JOIN properties p ON p.id = task.property_id
     LEFT JOIN tenants t ON t.id = task.tenant_id
     ${where}
     ORDER BY task.created_at DESC`,
  );
  return user.role === "superadmin" ? statement.all() : statement.bind(user.id).all();
}

async function canAccessProperty(env: Env, user: SessionUser, propertyId: string) {
  const property = await getProperty(env, propertyId);
  if (!property) {
    return false;
  }
  if (user.role === "superadmin") {
    return true;
  }
  if (user.role === "owner") {
    return property.owner_id === user.id;
  }
  const tenant = await getTenantProfile(env, user.id);
  return tenant?.property_id === propertyId;
}

async function authRoutes(request: Request, env: Env, pathname: string) {
  if (pathname === "/api/auth/register" && request.method === "POST") {
    const body = await parseBody<{ email: string; password: string; full_name: string }>(request);
    if (!body.email || !body.password || !body.full_name) {
      return error(400, "Missing required registration fields");
    }
    if (body.password.length < 6) {
      return error(400, "Password must be at least 6 characters");
    }

    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(body.email.toLowerCase()).first();
    if (existing) {
      return error(409, "User already exists");
    }

    const user = {
      id: uuid(),
      email: body.email.toLowerCase(),
      full_name: body.full_name,
      password_hash: await hashPassword(body.password),
      role: "owner" as UserRole,
    };

    await env.DB.prepare("INSERT INTO users (id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(user.id, user.email, user.full_name, user.password_hash, user.role)
      .run();

    const token = await signJwt(env, user);
    return json({ token, user });
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    const body = await parseBody<{ email: string; password: string }>(request);
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").bind(body.email.toLowerCase()).first<Record<string, string>>();
    if (!user || user.password_hash !== (await hashPassword(body.password))) {
      return error(401, "Invalid credentials");
    }

    const payload = { id: user.id, email: user.email, full_name: user.full_name, role: user.role as UserRole };
    const token = await signJwt(env, payload);
    return json({ token, user: payload });
  }

  if (pathname === "/api/auth/me" && request.method === "GET") {
    const session = await requireUser(request, env);
    return json({ user: session });
  }

  return null;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    try {
      const url = new URL(request.url);
      const authResponse = await authRoutes(request, env, url.pathname);
      if (authResponse) {
        const headers = new Headers(authResponse.headers);
        Object.entries(corsHeaders(env)).forEach(([key, value]) => headers.set(key, value));
        return new Response(authResponse.body, { status: authResponse.status, headers });
      }

      if (!url.pathname.startsWith("/api/")) {
        return error(404, "Not found");
      }

      const user = await requireUser(
        request,
        env,
        url.pathname.startsWith("/api/properties") || url.pathname.startsWith("/api/tenants") || url.pathname.startsWith("/api/payments") || url.pathname.startsWith("/api/meters") || url.pathname.startsWith("/api/tasks")
          ? undefined
          : ["owner", "superadmin", "tenant"],
      );

      const segments = url.pathname.split("/").filter(Boolean);
      const resource = segments[1];
      const recordId = segments[2];

      if (resource === "properties") {
        if (request.method === "GET" && !recordId) {
          const result = await listProperties(env, user);
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(env), "Content-Type": "application/json" } });
        }

        if (request.method === "POST") {
          if (user.role === "tenant") {
            return error(403, "Tenants cannot create properties");
          }
          const body = await parseBody<Record<string, string | number | null>>(request);
          if (!body.name || !body.address || !body.type) {
            return error(400, "Property name, address and type are required");
          }
          const id = uuid();
          const createdAt = nowIso();
          await env.DB.prepare(
            "INSERT INTO properties (id, owner_id, name, address, type, status, rent_amount, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
            .bind(id, user.role === "superadmin" ? String(body.owner_id || user.id) : user.id, body.name, body.address, body.type, body.status || "free", Number(body.rent_amount || 0), body.notes || null, createdAt, createdAt)
            .run();
          const property = await getProperty(env, id);
          return json(property, { headers: corsHeaders(env) });
        }

        if (recordId && request.method === "PUT") {
          if (!(await canAccessProperty(env, user, recordId))) {
            return error(403, "Forbidden");
          }
          const body = await parseBody<Record<string, string | number | null>>(request);
          await env.DB.prepare(
            "UPDATE properties SET name = ?, address = ?, type = ?, status = ?, rent_amount = ?, notes = ?, updated_at = ? WHERE id = ?",
          )
            .bind(body.name, body.address, body.type, body.status, Number(body.rent_amount || 0), body.notes || null, nowIso(), recordId)
            .run();
          return json(await getProperty(env, recordId), { headers: corsHeaders(env) });
        }

        if (recordId && request.method === "DELETE") {
          if (!(await canAccessProperty(env, user, recordId))) {
            return error(403, "Forbidden");
          }
          await env.DB.prepare("DELETE FROM properties WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(env) });
        }
      }

      if (resource === "tenants") {
        if (request.method === "GET" && !recordId) {
          const result = await listTenants(env, user);
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(env), "Content-Type": "application/json" } });
        }

        if (request.method === "POST") {
          if (user.role === "tenant") {
            return error(403, "Tenants cannot create tenants");
          }
          const body = await parseBody<Record<string, string | number | null>>(request);
          if (!(await canAccessProperty(env, user, String(body.property_id)))) {
            return error(403, "Forbidden");
          }
          let linkedUserId: string | null = null;
          if (body.access_password && body.email) {
            linkedUserId = uuid();
            await env.DB.prepare("INSERT INTO users (id, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, ?)")
              .bind(linkedUserId, String(body.email).toLowerCase(), body.full_name, await hashPassword(String(body.access_password)), "tenant")
              .run();
          }
          const id = uuid();
          const createdAt = nowIso();
          await env.DB.prepare(
            "INSERT INTO tenants (id, owner_id, user_id, property_id, full_name, email, phone, lease_start, lease_end, monthly_rent, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
            .bind(id, user.role === "superadmin" ? String(body.owner_id || user.id) : user.id, linkedUserId, body.property_id, body.full_name, String(body.email).toLowerCase(), body.phone, body.lease_start, body.lease_end, Number(body.monthly_rent || 0), body.notes || null, createdAt, createdAt)
            .run();
          return json({ id }, { headers: corsHeaders(env) });
        }

        if (recordId && request.method === "PUT") {
          const current = await env.DB.prepare("SELECT property_id, owner_id, user_id FROM tenants WHERE id = ?").bind(recordId).first<Record<string, string>>();
          if (!current || !(await canAccessProperty(env, user, current.property_id))) {
            return error(403, "Forbidden");
          }
          const body = await parseBody<Record<string, string | number | null>>(request);
          await env.DB.prepare(
            "UPDATE tenants SET property_id = ?, full_name = ?, email = ?, phone = ?, lease_start = ?, lease_end = ?, monthly_rent = ?, notes = ?, updated_at = ? WHERE id = ?",
          )
            .bind(body.property_id, body.full_name, String(body.email).toLowerCase(), body.phone, body.lease_start, body.lease_end, Number(body.monthly_rent || 0), body.notes || null, nowIso(), recordId)
            .run();
          return json({ id: recordId }, { headers: corsHeaders(env) });
        }

        if (recordId && request.method === "DELETE") {
          const current = await env.DB.prepare("SELECT property_id FROM tenants WHERE id = ?").bind(recordId).first<Record<string, string>>();
          if (!current || !(await canAccessProperty(env, user, current.property_id))) {
            return error(403, "Forbidden");
          }
          await env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(env) });
        }
      }

      if (resource === "payments") {
        if (request.method === "GET" && !recordId) {
          const result = await listPayments(env, user);
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(env), "Content-Type": "application/json" } });
        }

        if (request.method === "POST" || request.method === "PUT") {
          const body = await parseBody<Record<string, string | number | null>>(request);
          if (!(await canAccessProperty(env, user, String(body.property_id)))) {
            return error(403, "Forbidden");
          }
          const status = paymentStatus(String(body.due_date), (body.paid_at as string | null) || null);
          const total = Number(body.base_amount || 0) + Number(body.utilities_amount || 0);
          const id = recordId || uuid();
          const sql =
            request.method === "POST"
              ? "INSERT INTO payments (id, property_id, tenant_id, payment_type, period_month, base_amount, utilities_amount, total_amount, due_date, paid_at, status, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
              : "UPDATE payments SET property_id = ?, tenant_id = ?, payment_type = ?, period_month = ?, base_amount = ?, utilities_amount = ?, total_amount = ?, due_date = ?, paid_at = ?, status = ?, note = ?, updated_at = ? WHERE id = ?";
          const params =
            request.method === "POST"
              ? [id, body.property_id, body.tenant_id || null, body.payment_type, body.period_month, Number(body.base_amount || 0), Number(body.utilities_amount || 0), total, body.due_date, body.paid_at || null, status, body.note || null, nowIso(), nowIso()]
              : [body.property_id, body.tenant_id || null, body.payment_type, body.period_month, Number(body.base_amount || 0), Number(body.utilities_amount || 0), total, body.due_date, body.paid_at || null, status, body.note || null, nowIso(), id];
          await env.DB.prepare(sql).bind(...params).run();
          return json({ id, status, total_amount: total }, { headers: corsHeaders(env) });
        }

        if (recordId && request.method === "DELETE") {
          await env.DB.prepare("DELETE FROM payments WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(env) });
        }
      }

      if (resource === "meters") {
        if (request.method === "GET" && !recordId) {
          const result = await listMeters(env, user);
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(env), "Content-Type": "application/json" } });
        }

        if (request.method === "POST" || request.method === "PUT") {
          const body = await parseBody<Record<string, string | number | null>>(request);
          if (!(await canAccessProperty(env, user, String(body.property_id)))) {
            return error(403, "Forbidden");
          }
          const id = recordId || uuid();
          const sql =
            request.method === "POST"
              ? "INSERT INTO meters (id, property_id, meter_type, unit, previous_reading, current_reading, tariff, reading_date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
              : "UPDATE meters SET property_id = ?, meter_type = ?, unit = ?, previous_reading = ?, current_reading = ?, tariff = ?, reading_date = ?, note = ?, updated_at = ? WHERE id = ?";
          const params =
            request.method === "POST"
              ? [id, body.property_id, body.meter_type, body.unit, Number(body.previous_reading || 0), Number(body.current_reading || 0), Number(body.tariff || 0), body.reading_date, body.note || null, nowIso(), nowIso()]
              : [body.property_id, body.meter_type, body.unit, Number(body.previous_reading || 0), Number(body.current_reading || 0), Number(body.tariff || 0), body.reading_date, body.note || null, nowIso(), id];
          await env.DB.prepare(sql).bind(...params).run();
          return json({ id }, { headers: corsHeaders(env) });
        }

        if (recordId && request.method === "DELETE") {
          await env.DB.prepare("DELETE FROM meters WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(env) });
        }
      }

      if (resource === "tasks") {
        if (request.method === "GET" && !recordId) {
          const result = await listTasks(env, user);
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(env), "Content-Type": "application/json" } });
        }

        if (request.method === "POST" || request.method === "PUT") {
          const body = await parseBody<Record<string, string | number | null>>(request);
          if (!(await canAccessProperty(env, user, String(body.property_id)))) {
            return error(403, "Forbidden");
          }
          const resolvedStatus = taskStatus(String(body.due_date), String(body.status || "open"));
          const id = recordId || uuid();
          const sql =
            request.method === "POST"
              ? "INSERT INTO tasks (id, property_id, tenant_id, title, description, priority, status, due_date, reminder_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
              : "UPDATE tasks SET property_id = ?, tenant_id = ?, title = ?, description = ?, priority = ?, status = ?, due_date = ?, reminder_at = ?, completed_at = ?, updated_at = ? WHERE id = ?";
          const completedAt = resolvedStatus === "done" ? nowIso() : null;
          const params =
            request.method === "POST"
              ? [id, body.property_id, body.tenant_id || null, body.title, body.description || null, body.priority || "medium", resolvedStatus, body.due_date, body.reminder_at || null, completedAt, nowIso(), nowIso()]
              : [body.property_id, body.tenant_id || null, body.title, body.description || null, body.priority || "medium", resolvedStatus, body.due_date, body.reminder_at || null, completedAt, nowIso(), id];
          await env.DB.prepare(sql).bind(...params).run();
          return json({ id, status: resolvedStatus }, { headers: corsHeaders(env) });
        }

        if (recordId && request.method === "DELETE") {
          await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(env) });
        }
      }

      return error(404, "Route not found");
    } catch (caught) {
      if (caught instanceof Response) {
        return new Response(caught.body, { status: caught.status, headers: { ...corsHeaders(env), "Content-Type": "application/json" } });
      }

      const message = caught instanceof Error ? caught.message : "Unknown server error";
      return error(500, "Internal Server Error", message);
    }
  },
} satisfies ExportedHandler<Env>;
