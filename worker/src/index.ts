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

const defaultPreferences = {
  themeMode: "default",
  badgePreferences: {
    all: true,
    properties: true,
    tasks: true,
    invoices: true,
  },
  avatarScale: 1,
  avatarX: 0,
  avatarY: 0,
};

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
const decoder = new TextDecoder();
const PBKDF2_ITERATIONS = 310000;

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

function getJwtSecret(env: Env) {
  const secret = env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

async function legacyHashPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  return base64UrlEncode(digest);
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return base64UrlEncode(derivedBits);
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${base64UrlEncode(salt)}$${digest}`;
}

async function verifyPassword(password: string, storedHash: string) {
  if (storedHash.startsWith("pbkdf2$")) {
    const [, iterationsRaw, saltRaw, expectedHash] = storedHash.split("$");
    const iterations = Number(iterationsRaw);
    if (!iterations || !saltRaw || !expectedHash) {
      return { valid: false, needsUpgrade: false };
    }

    const actualHash = await derivePasswordHash(password, base64UrlDecode(saltRaw), iterations);
    return { valid: actualHash === expectedHash, needsUpgrade: false };
  }

  const legacyHash = await legacyHashPassword(password);
  return { valid: legacyHash === storedHash, needsUpgrade: legacyHash === storedHash };
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

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

function corsHeaders(request: Request, env: Env) {
  const configuredOrigins = (env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);
  const requestOrigin = request.headers.get("Origin");
  const normalizedRequestOrigin = requestOrigin ? normalizeOrigin(requestOrigin) : null;
  const allowOrigin =
    !configuredOrigins.length
      ? "*"
      : normalizedRequestOrigin && configuredOrigins.includes(normalizedRequestOrigin)
        ? normalizedRequestOrigin
        : configuredOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    Vary: "Origin",
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

async function getUserRecord(env: Env, userId: string) {
  return await env.DB.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(userId).first<Record<string, string>>();
}

async function getPaymentRecord(env: Env, paymentId: string) {
  return await env.DB.prepare("SELECT id, property_id FROM payments WHERE id = ? LIMIT 1").bind(paymentId).first<Record<string, string>>();
}

async function getMeterRecord(env: Env, meterId: string) {
  return await env.DB.prepare("SELECT id, property_id FROM meters WHERE id = ? LIMIT 1").bind(meterId).first<Record<string, string>>();
}

async function getTaskRecord(env: Env, taskId: string) {
  return await env.DB.prepare("SELECT id, property_id FROM tasks WHERE id = ? LIMIT 1").bind(taskId).first<Record<string, string>>();
}

function normalizePreferences(value: string | null | undefined) {
  if (!value) {
    return defaultPreferences;
  }

  try {
    const parsed = JSON.parse(value) as Partial<typeof defaultPreferences>;
    return {
      ...defaultPreferences,
      ...parsed,
      badgePreferences: {
        ...defaultPreferences.badgePreferences,
        ...(parsed.badgePreferences ?? {}),
      },
    };
  } catch {
    return defaultPreferences;
  }
}

function sanitizeUser(user: Record<string, string | null>) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone ?? "",
    avatar: user.avatar ?? null,
    preferences: normalizePreferences(user.preferences),
    role: user.role as UserRole,
    created_at: user.created_at,
  };
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

async function ensureRecordPropertyAccess(env: Env, user: SessionUser, propertyId: string) {
  if (!(await canAccessProperty(env, user, propertyId))) {
    return error(403, "Forbidden");
  }
  return null;
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

    const ownersCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM users WHERE role IN ('owner', 'superadmin')",
    ).first<{ count: number | string }>();
    const role: UserRole = Number(ownersCount?.count ?? 0) === 0 ? "superadmin" : "owner";

    const user = {
      id: uuid(),
      email: body.email.toLowerCase(),
      full_name: body.full_name,
      phone: "",
      avatar: null,
      preferences: JSON.stringify(defaultPreferences),
      password_hash: await hashPassword(body.password),
      role,
    };

    await env.DB.prepare("INSERT INTO users (id, email, full_name, phone, avatar, preferences, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(user.id, user.email, user.full_name, user.phone, user.avatar, user.preferences, user.password_hash, user.role)
      .run();

    const token = await signJwt(env, {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    });
    return json({ token, user: sanitizeUser({ ...user, created_at: nowIso() }) });
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    const body = await parseBody<{ email: string; password: string }>(request);
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").bind(body.email.toLowerCase()).first<Record<string, string>>();
    if (!user) {
      return error(401, "Invalid credentials");
    }

    const passwordCheck = await verifyPassword(body.password, user.password_hash);
    if (!passwordCheck.valid) {
      return error(401, "Invalid credentials");
    }

    if (passwordCheck.needsUpgrade) {
      const upgradedHash = await hashPassword(body.password);
      await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(upgradedHash, user.id).run();
      user.password_hash = upgradedHash;
    }

    const payload = { id: user.id, email: user.email, full_name: user.full_name, role: user.role as UserRole };
    const token = await signJwt(env, payload);
    return json({ token, user: sanitizeUser(user) });
  }

  if (pathname === "/api/auth/me" && request.method === "GET") {
    const session = await requireUser(request, env);
    const user = await getUserRecord(env, session.id);
    if (!user) {
      return error(404, "User not found");
    }
    return json({ user: sanitizeUser(user) });
  }

  if (pathname === "/api/profile" && request.method === "PUT") {
    const session = await requireUser(request, env);
    const body = await parseBody<{
      full_name: string;
      phone?: string;
      avatar?: string | null;
      preferences?: typeof defaultPreferences;
    }>(request);
    await env.DB.prepare("UPDATE users SET full_name = ?, phone = ?, avatar = ?, preferences = ? WHERE id = ?")
      .bind(
        body.full_name || session.full_name,
        body.phone ?? "",
        body.avatar ?? null,
        JSON.stringify({
          ...defaultPreferences,
          ...(body.preferences ?? {}),
          badgePreferences: {
            ...defaultPreferences.badgePreferences,
            ...(body.preferences?.badgePreferences ?? {}),
          },
        }),
        session.id,
      )
      .run();
    const user = await getUserRecord(env, session.id);
    if (!user) {
      return error(404, "User not found");
    }
    return json({ user: sanitizeUser(user) });
  }

  return null;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    try {
      const url = new URL(request.url);
      const authResponse = await authRoutes(request, env, url.pathname);
      if (authResponse) {
        const headers = new Headers(authResponse.headers);
        Object.entries(corsHeaders(request, env)).forEach(([key, value]) => headers.set(key, value));
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
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(request, env), "Content-Type": "application/json" } });
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
          return json(property, { headers: corsHeaders(request, env) });
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
          return json(await getProperty(env, recordId), { headers: corsHeaders(request, env) });
        }

        if (recordId && request.method === "DELETE") {
          if (!(await canAccessProperty(env, user, recordId))) {
            return error(403, "Forbidden");
          }
          await env.DB.prepare("DELETE FROM properties WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(request, env) });
        }
      }

      if (resource === "tenants") {
        if (request.method === "GET" && !recordId) {
          const result = await listTenants(env, user);
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(request, env), "Content-Type": "application/json" } });
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
          return json({ id }, { headers: corsHeaders(request, env) });
        }

        if (recordId && request.method === "PUT") {
          const current = await env.DB.prepare("SELECT property_id, owner_id, user_id FROM tenants WHERE id = ?").bind(recordId).first<Record<string, string>>();
          if (!current || !(await canAccessProperty(env, user, current.property_id))) {
            return error(403, "Forbidden");
          }
          const body = await parseBody<Record<string, string | number | null>>(request);
          if (body.property_id && String(body.property_id) !== current.property_id) {
            const accessError = await ensureRecordPropertyAccess(env, user, String(body.property_id));
            if (accessError) {
              return accessError;
            }
          }
          await env.DB.prepare(
            "UPDATE tenants SET property_id = ?, full_name = ?, email = ?, phone = ?, lease_start = ?, lease_end = ?, monthly_rent = ?, notes = ?, updated_at = ? WHERE id = ?",
          )
            .bind(body.property_id, body.full_name, String(body.email).toLowerCase(), body.phone, body.lease_start, body.lease_end, Number(body.monthly_rent || 0), body.notes || null, nowIso(), recordId)
            .run();
          return json({ id: recordId }, { headers: corsHeaders(request, env) });
        }

        if (recordId && request.method === "DELETE") {
          const current = await env.DB.prepare("SELECT property_id FROM tenants WHERE id = ?").bind(recordId).first<Record<string, string>>();
          if (!current || !(await canAccessProperty(env, user, current.property_id))) {
            return error(403, "Forbidden");
          }
          await env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(request, env) });
        }
      }

      if (resource === "payments") {
        if (request.method === "GET" && !recordId) {
          const result = await listPayments(env, user);
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(request, env), "Content-Type": "application/json" } });
        }

        if (request.method === "POST" || request.method === "PUT") {
          const body = await parseBody<Record<string, string | number | null>>(request);
          if (recordId) {
            const current = await getPaymentRecord(env, recordId);
            if (!current) {
              return error(404, "Payment not found");
            }
            const currentAccessError = await ensureRecordPropertyAccess(env, user, current.property_id);
            if (currentAccessError) {
              return currentAccessError;
            }
          }
          const targetAccessError = await ensureRecordPropertyAccess(env, user, String(body.property_id));
          if (targetAccessError) {
            return targetAccessError;
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
          return json({ id, status, total_amount: total }, { headers: corsHeaders(request, env) });
        }

        if (recordId && request.method === "DELETE") {
          const current = await getPaymentRecord(env, recordId);
          if (!current) {
            return error(404, "Payment not found");
          }
          const accessError = await ensureRecordPropertyAccess(env, user, current.property_id);
          if (accessError) {
            return accessError;
          }
          await env.DB.prepare("DELETE FROM payments WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(request, env) });
        }
      }

      if (resource === "meters") {
        if (request.method === "GET" && !recordId) {
          const result = await listMeters(env, user);
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(request, env), "Content-Type": "application/json" } });
        }

        if (request.method === "POST" || request.method === "PUT") {
          const body = await parseBody<Record<string, string | number | null>>(request);
          if (recordId) {
            const current = await getMeterRecord(env, recordId);
            if (!current) {
              return error(404, "Meter record not found");
            }
            const currentAccessError = await ensureRecordPropertyAccess(env, user, current.property_id);
            if (currentAccessError) {
              return currentAccessError;
            }
          }
          const targetAccessError = await ensureRecordPropertyAccess(env, user, String(body.property_id));
          if (targetAccessError) {
            return targetAccessError;
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
          return json({ id }, { headers: corsHeaders(request, env) });
        }

        if (recordId && request.method === "DELETE") {
          const current = await getMeterRecord(env, recordId);
          if (!current) {
            return error(404, "Meter record not found");
          }
          const accessError = await ensureRecordPropertyAccess(env, user, current.property_id);
          if (accessError) {
            return accessError;
          }
          await env.DB.prepare("DELETE FROM meters WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(request, env) });
        }
      }

      if (resource === "tasks") {
        if (request.method === "GET" && !recordId) {
          const result = await listTasks(env, user);
          return new Response(JSON.stringify(result.results ?? []), { headers: { ...corsHeaders(request, env), "Content-Type": "application/json" } });
        }

        if (request.method === "POST" || request.method === "PUT") {
          const body = await parseBody<Record<string, string | number | null>>(request);
          if (recordId) {
            const current = await getTaskRecord(env, recordId);
            if (!current) {
              return error(404, "Task not found");
            }
            const currentAccessError = await ensureRecordPropertyAccess(env, user, current.property_id);
            if (currentAccessError) {
              return currentAccessError;
            }
          }
          const targetAccessError = await ensureRecordPropertyAccess(env, user, String(body.property_id));
          if (targetAccessError) {
            return targetAccessError;
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
          return json({ id, status: resolvedStatus }, { headers: corsHeaders(request, env) });
        }

        if (recordId && request.method === "DELETE") {
          const current = await getTaskRecord(env, recordId);
          if (!current) {
            return error(404, "Task not found");
          }
          const accessError = await ensureRecordPropertyAccess(env, user, current.property_id);
          if (accessError) {
            return accessError;
          }
          await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(recordId).run();
          return new Response(null, { status: 204, headers: corsHeaders(request, env) });
        }
      }

      return error(404, "Route not found");
    } catch (caught) {
      if (caught instanceof Response) {
        return new Response(caught.body, { status: caught.status, headers: { ...corsHeaders(request, env), "Content-Type": "application/json" } });
      }

      const message = caught instanceof Error ? caught.message : "Unknown server error";
      return error(500, "Internal Server Error", message);
    }
  },
} satisfies ExportedHandler<Env>;
