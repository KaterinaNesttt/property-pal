export interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  CORS_ORIGIN?: string;
}

type UserRole = "superadmin" | "owner" | "tenant";
type PropertyStatus = "free" | "rented" | "maintenance";
type PaymentStatus = "paid" | "pending" | "overdue";
type PaymentType = "rent" | "utilities" | "internet" | "other";
type MeterType = "water" | "gas" | "electricity";
type TaskPriority = "low" | "medium" | "high";
type TaskStatus = "open" | "in_progress" | "done" | "overdue";

interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  exp: number;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar: string | null;
  preferences: string | null;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

interface PropertyRow {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  type: string;
  status: PropertyStatus;
  rent_amount: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant_name?: string | null;
}

interface TenantRow {
  id: string;
  owner_id: string;
  user_id: string | null;
  property_id: string;
  full_name: string;
  email: string;
  phone: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number | string;
  is_active: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  property_name?: string | null;
}

interface PaymentRow {
  id: string;
  property_id: string;
  tenant_id: string | null;
  payment_type: PaymentType;
  period_month: string;
  base_amount: number | string;
  utilities_amount: number | string;
  total_amount: number | string;
  due_date: string;
  paid_at: string | null;
  status: PaymentStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  property_name?: string | null;
  tenant_name?: string | null;
}

interface MeterRow {
  id: string;
  property_id: string;
  meter_type: MeterType;
  unit: string;
  previous_reading: number | string;
  current_reading: number | string;
  tariff: number | string;
  reading_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  property_name?: string | null;
}

interface TaskRow {
  id: string;
  property_id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  reminder_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  property_name?: string | null;
  tenant_name?: string | null;
}

interface ProfilePayload {
  full_name: string;
  phone?: string;
  avatar?: string | null;
  preferences?: unknown;
}

class HttpError extends Error {
  status: number;
  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PBKDF2_ITERATIONS = 100000;

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

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

function corsHeaders(request: Request, env: Env) {
  const allowedOrigins = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
  const requestOrigin = request.headers.get("Origin");
  const normalizedRequestOrigin = requestOrigin ? normalizeOrigin(requestOrigin) : null;
  const allowOrigin =
    allowedOrigins.length === 0
      ? normalizedRequestOrigin ?? "*"
      : normalizedRequestOrigin && allowedOrigins.includes(normalizedRequestOrigin)
        ? normalizedRequestOrigin
        : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(request: Request, env: Env, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}

function emptyResponse(request: Request, env: Env, status = 204) {
  return new Response(null, {
    status,
    headers: corsHeaders(request, env),
  });
}

function errorResponse(request: Request, env: Env, status: number, message: string, details?: string) {
  return jsonResponse(request, env, { error: message, details }, status);
}

function getJwtSecret(env: Env) {
  const secret = env.JWT_SECRET?.trim();
  if (!secret) {
    throw new HttpError(500, "Server configuration error", "JWT_SECRET is not configured");
  }
  return secret;
}

function base64UrlEncode(value: ArrayBuffer | Uint8Array | string) {
  const bytes =
    typeof value === "string"
      ? encoder.encode(value)
      : value instanceof Uint8Array
        ? value
        : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signJwt(env: Env, payload: Omit<SessionUser, "exp">) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = base64UrlEncode(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    }),
  );
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
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signature),
    encoder.encode(`${header}.${payload}`),
  );
  if (!isValid) {
    return null;
  }

  const claims = JSON.parse(decoder.decode(base64UrlDecode(payload))) as SessionUser;
  if (claims.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return claims;
}

async function legacyHashPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  return base64UrlEncode(digest);
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return base64UrlEncode(bits);
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
  return {
    valid: legacyHash === storedHash,
    needsUpgrade: legacyHash === storedHash,
  };
}

async function parseBody<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

function asString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `Field "${field}" is required`);
  }
  return value.trim();
}

function asOptionalString(value: unknown) {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "Invalid string field");
  }
  return value.trim();
}

function asNumber(value: unknown, field: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `Field "${field}" must be a number`);
  }
  return parsed;
}

function asNullableId(value: unknown) {
  if (value == null || value === "") {
    return null;
  }
  return asString(value, "id");
}

function normalizePreferences(raw: string | null | undefined) {
  if (!raw) {
    return defaultPreferences;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<typeof defaultPreferences>;
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

function sanitizeUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    avatar: user.avatar,
    preferences: normalizePreferences(user.preferences),
    role: user.role,
    created_at: user.created_at,
  };
}

function mapProperty(row: PropertyRow) {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    address: row.address,
    type: row.type,
    status: row.status,
    rent_amount: Number(row.rent_amount),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tenant_name: row.tenant_name ?? null,
  };
}

function mapTenant(row: TenantRow) {
  return {
    id: row.id,
    owner_id: row.owner_id,
    user_id: row.user_id,
    property_id: row.property_id,
    property_name: row.property_name ?? null,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    lease_start: row.lease_start,
    lease_end: row.lease_end,
    monthly_rent: Number(row.monthly_rent),
    is_active: Number(row.is_active),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPayment(row: PaymentRow) {
  return {
    id: row.id,
    property_id: row.property_id,
    property_name: row.property_name ?? null,
    tenant_id: row.tenant_id,
    tenant_name: row.tenant_name ?? null,
    payment_type: row.payment_type,
    period_month: row.period_month,
    base_amount: Number(row.base_amount),
    utilities_amount: Number(row.utilities_amount),
    total_amount: Number(row.total_amount),
    due_date: row.due_date,
    paid_at: row.paid_at,
    status: row.status,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapMeter(row: MeterRow) {
  return {
    id: row.id,
    property_id: row.property_id,
    property_name: row.property_name ?? null,
    meter_type: row.meter_type,
    unit: row.unit,
    previous_reading: Number(row.previous_reading),
    current_reading: Number(row.current_reading),
    tariff: Number(row.tariff),
    reading_date: row.reading_date,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapTask(row: TaskRow) {
  return {
    id: row.id,
    property_id: row.property_id,
    property_name: row.property_name ?? null,
    tenant_id: row.tenant_id,
    tenant_name: row.tenant_name ?? null,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    due_date: row.due_date,
    reminder_at: row.reminder_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function computePaymentStatus(dueDate: string, paidAt: string | null): PaymentStatus {
  if (paidAt) {
    return "paid";
  }
  return new Date(`${dueDate}T23:59:59`).getTime() < Date.now() ? "overdue" : "pending";
}

function computeTaskStatus(status: string, dueDate: string): TaskStatus {
  if (status === "done") {
    return "done";
  }
  if (new Date(`${dueDate}T23:59:59`).getTime() < Date.now()) {
    return "overdue";
  }
  if (status === "in_progress") {
    return "in_progress";
  }
  return "open";
}

async function requireSession(request: Request, env: Env, allowedRoles?: UserRole[]) {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized");
  }

  const session = await verifyJwt(env, header.slice("Bearer ".length));
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new HttpError(403, "Forbidden");
  }

  return session;
}

async function getUserById(env: Env, id: string) {
  return await env.DB.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(id).first<UserRow>();
}

async function getTenantByUserId(env: Env, userId: string) {
  return await env.DB.prepare("SELECT * FROM tenants WHERE user_id = ? LIMIT 1").bind(userId).first<TenantRow>();
}

async function getPropertyForSession(env: Env, session: SessionUser, propertyId: string) {
  if (session.role === "superadmin") {
    return await env.DB.prepare("SELECT * FROM properties WHERE id = ? LIMIT 1").bind(propertyId).first<PropertyRow>();
  }
  if (session.role === "owner") {
    return await env.DB.prepare("SELECT * FROM properties WHERE id = ? AND owner_id = ? LIMIT 1").bind(propertyId, session.id).first<PropertyRow>();
  }

  const tenant = await getTenantByUserId(env, session.id);
  if (!tenant || tenant.property_id !== propertyId) {
    return null;
  }
  return await env.DB.prepare("SELECT * FROM properties WHERE id = ? LIMIT 1").bind(propertyId).first<PropertyRow>();
}

async function assertPropertyAccess(env: Env, session: SessionUser, propertyId: string) {
  const property = await getPropertyForSession(env, session, propertyId);
  if (!property) {
    throw new HttpError(404, "Property not found");
  }
  return property;
}

async function assertOwnerMutationAccess(session: SessionUser) {
  if (session.role !== "owner" && session.role !== "superadmin") {
    throw new HttpError(403, "Forbidden");
  }
}

async function syncPropertyStatus(env: Env, propertyId: string) {
  const activeTenants = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM tenants WHERE property_id = ? AND is_active = 1",
  ).bind(propertyId).first<{ count: number | string }>();
  const nextStatus: PropertyStatus = Number(activeTenants?.count ?? 0) > 0 ? "rented" : "free";
  await env.DB.prepare(
    "UPDATE properties SET status = CASE WHEN status = 'maintenance' THEN status ELSE ? END, updated_at = ? WHERE id = ?",
  ).bind(nextStatus, new Date().toISOString(), propertyId).run();
}

async function getActiveTenantForProperty(env: Env, propertyId: string, excludeTenantId?: string) {
  const sql = excludeTenantId
    ? "SELECT * FROM tenants WHERE property_id = ? AND is_active = 1 AND id != ? LIMIT 1"
    : "SELECT * FROM tenants WHERE property_id = ? AND is_active = 1 LIMIT 1";
  const bindValues = excludeTenantId ? [propertyId, excludeTenantId] : [propertyId];
  return await env.DB.prepare(sql).bind(...bindValues).first<TenantRow>();
}

async function listProperties(env: Env, session: SessionUser) {
  const sql = `
    SELECT
      p.*,
      t.full_name AS tenant_name
    FROM properties p
    LEFT JOIN tenants t
      ON t.property_id = p.id
      AND t.is_active = 1
    WHERE ${session.role === "superadmin" ? "1 = 1" : session.role === "owner" ? "p.owner_id = ?" : "p.id = ?"}
    ORDER BY p.created_at DESC
  `;
  const bindValues =
    session.role === "superadmin"
      ? []
      : session.role === "owner"
        ? [session.id]
        : [((await getTenantByUserId(env, session.id))?.property_id ?? "__none__")];

  const result = await env.DB.prepare(sql).bind(...bindValues).all<PropertyRow>();
  return result.results.map(mapProperty);
}

async function listTenants(env: Env, session: SessionUser) {
  const sql = `
    SELECT
      t.*,
      p.name AS property_name
    FROM tenants t
    JOIN properties p ON p.id = t.property_id
    WHERE ${session.role === "superadmin" ? "1 = 1" : session.role === "owner" ? "t.owner_id = ?" : "t.user_id = ?"}
    ORDER BY t.created_at DESC
  `;
  const bindValues = session.role === "superadmin" ? [] : [session.id];
  const result = await env.DB.prepare(sql).bind(...bindValues).all<TenantRow>();
  return result.results.map(mapTenant);
}

async function listPayments(env: Env, session: SessionUser) {
  let sql = `
    SELECT
      pay.*,
      p.name AS property_name,
      t.full_name AS tenant_name
    FROM payments pay
    JOIN properties p ON p.id = pay.property_id
    LEFT JOIN tenants t ON t.id = pay.tenant_id
  `;
  let bindValues: unknown[] = [];

  if (session.role === "owner") {
    sql += " WHERE p.owner_id = ?";
    bindValues = [session.id];
  } else if (session.role === "tenant") {
    const tenant = await getTenantByUserId(env, session.id);
    sql += " WHERE pay.property_id = ?";
    bindValues = [tenant?.property_id ?? "__none__"];
  }

  sql += " ORDER BY pay.due_date DESC, pay.created_at DESC";
  const result = await env.DB.prepare(sql).bind(...bindValues).all<PaymentRow>();
  return result.results.map(mapPayment);
}

async function listMeters(env: Env, session: SessionUser) {
  let sql = `
    SELECT
      m.*,
      p.name AS property_name
    FROM meters m
    JOIN properties p ON p.id = m.property_id
  `;
  let bindValues: unknown[] = [];

  if (session.role === "owner") {
    sql += " WHERE p.owner_id = ?";
    bindValues = [session.id];
  } else if (session.role === "tenant") {
    const tenant = await getTenantByUserId(env, session.id);
    sql += " WHERE m.property_id = ?";
    bindValues = [tenant?.property_id ?? "__none__"];
  }

  sql += " ORDER BY m.reading_date DESC, m.created_at DESC";
  const result = await env.DB.prepare(sql).bind(...bindValues).all<MeterRow>();
  return result.results.map(mapMeter);
}

async function listTasks(env: Env, session: SessionUser) {
  let sql = `
    SELECT
      task.*,
      p.name AS property_name,
      t.full_name AS tenant_name
    FROM tasks task
    JOIN properties p ON p.id = task.property_id
    LEFT JOIN tenants t ON t.id = task.tenant_id
  `;
  let bindValues: unknown[] = [];

  if (session.role === "owner") {
    sql += " WHERE p.owner_id = ?";
    bindValues = [session.id];
  } else if (session.role === "tenant") {
    const tenant = await getTenantByUserId(env, session.id);
    sql += " WHERE task.property_id = ?";
    bindValues = [tenant?.property_id ?? "__none__"];
  }

  sql += " ORDER BY task.due_date ASC, task.created_at DESC";
  const result = await env.DB.prepare(sql).bind(...bindValues).all<TaskRow>();
  const today = new Date().toISOString().slice(0, 10);
  return result.results
    .map((task) => ({
      ...task,
      status: task.status !== "done" && task.due_date < today ? "overdue" : task.status,
    }))
    .map(mapTask);
}

async function getOwnedTenantRow(env: Env, session: SessionUser, tenantId: string) {
  const sql =
    session.role === "superadmin"
      ? "SELECT * FROM tenants WHERE id = ? LIMIT 1"
      : "SELECT * FROM tenants WHERE id = ? AND owner_id = ? LIMIT 1";
  const bindValues = session.role === "superadmin" ? [tenantId] : [tenantId, session.id];
  return await env.DB.prepare(sql).bind(...bindValues).first<TenantRow>();
}

async function getOwnedPaymentRow(env: Env, session: SessionUser, paymentId: string) {
  const sql = `
    SELECT pay.*
    FROM payments pay
    JOIN properties p ON p.id = pay.property_id
    WHERE pay.id = ?
      AND ${session.role === "superadmin" ? "1 = 1" : "p.owner_id = ?"}
    LIMIT 1
  `;
  const bindValues = session.role === "superadmin" ? [paymentId] : [paymentId, session.id];
  return await env.DB.prepare(sql).bind(...bindValues).first<PaymentRow>();
}

async function getOwnedMeterRow(env: Env, session: SessionUser, meterId: string) {
  const sql = `
    SELECT m.*
    FROM meters m
    JOIN properties p ON p.id = m.property_id
    WHERE m.id = ?
      AND ${session.role === "superadmin" ? "1 = 1" : "p.owner_id = ?"}
    LIMIT 1
  `;
  const bindValues = session.role === "superadmin" ? [meterId] : [meterId, session.id];
  return await env.DB.prepare(sql).bind(...bindValues).first<MeterRow>();
}

async function getOwnedTaskRow(env: Env, session: SessionUser, taskId: string) {
  const sql = `
    SELECT task.*
    FROM tasks task
    JOIN properties p ON p.id = task.property_id
    WHERE task.id = ?
      AND ${session.role === "superadmin" ? "1 = 1" : "p.owner_id = ?"}
    LIMIT 1
  `;
  const bindValues = session.role === "superadmin" ? [taskId] : [taskId, session.id];
  return await env.DB.prepare(sql).bind(...bindValues).first<TaskRow>();
}

async function handleRegister(request: Request, env: Env) {
  const body = await parseBody<{ email: unknown; password: unknown; full_name: unknown }>(request);
  const email = asString(body.email, "email").toLowerCase();
  const password = asString(body.password, "password");
  const fullName = asString(body.full_name, "full_name");

  if (password.length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters long");
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first<{ id: string }>();
  if (existing) {
    throw new HttpError(409, "User with this email already exists");
  }

  const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number | string }>();
  const role: UserRole = Number(count?.count ?? 0) === 0 ? "superadmin" : "owner";
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    "INSERT INTO users (id, email, full_name, phone, avatar, preferences, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(id, email, fullName, null, null, JSON.stringify(defaultPreferences), passwordHash, role).run();

  const user = await getUserById(env, id);
  if (!user) {
    throw new HttpError(500, "Failed to create user");
  }

  return jsonResponse(request, env, {
    token: await signJwt(env, {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    }),
    user: sanitizeUser(user),
  });
}

async function handleLogin(request: Request, env: Env) {
  const body = await parseBody<{ email: unknown; password: unknown }>(request);
  const email = asString(body.email, "email").toLowerCase();
  const password = asString(body.password, "password");

  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").bind(email).first<UserRow>();
  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }

  const passwordCheck = await verifyPassword(password, user.password_hash);
  if (!passwordCheck.valid) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (passwordCheck.needsUpgrade) {
    const upgradedHash = await hashPassword(password);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(upgradedHash, user.id).run();
    user.password_hash = upgradedHash;
  }

  return jsonResponse(request, env, {
    token: await signJwt(env, {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    }),
    user: sanitizeUser(user),
  });
}

async function handleMe(request: Request, env: Env) {
  const session = await requireSession(request, env);
  const user = await getUserById(env, session.id);
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return jsonResponse(request, env, { user: sanitizeUser(user) });
}

async function handleProfile(request: Request, env: Env) {
  const session = await requireSession(request, env);
  const body = await parseBody<ProfilePayload>(request);
  const user = await getUserById(env, session.id);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const fullName = asString(body.full_name, "full_name");
  const phone = asOptionalString(body.phone) ?? "";
  const avatar = body.avatar === undefined ? user.avatar : asOptionalString(body.avatar);
  const preferences =
    body.preferences && typeof body.preferences === "object"
      ? JSON.stringify({
          ...defaultPreferences,
          ...(body.preferences as Record<string, unknown>),
          badgePreferences: {
            ...defaultPreferences.badgePreferences,
            ...(((body.preferences as Record<string, unknown>).badgePreferences as Record<string, unknown> | undefined) ?? {}),
          },
        })
      : JSON.stringify(normalizePreferences(user.preferences));

  await env.DB.prepare(
    "UPDATE users SET full_name = ?, phone = ?, avatar = ?, preferences = ? WHERE id = ?",
  ).bind(fullName, phone, avatar, preferences, session.id).run();

  const updated = await getUserById(env, session.id);
  if (!updated) {
    throw new HttpError(500, "Failed to load updated profile");
  }

  return jsonResponse(request, env, { user: sanitizeUser(updated) });
}

async function handleProperties(request: Request, env: Env, pathname: string) {
  const session = await requireSession(request, env);
  const segments = pathname.split("/").filter(Boolean);
  const propertyId = segments[2];

  if (request.method === "GET" && !propertyId) {
    return jsonResponse(request, env, await listProperties(env, session));
  }

  if (request.method === "GET" && propertyId) {
    const property = await assertPropertyAccess(env, session, propertyId);
    const tenant = await getActiveTenantForProperty(env, propertyId);
    return jsonResponse(request, env, mapProperty({ ...property, tenant_name: tenant?.full_name ?? null }));
  }

  await assertOwnerMutationAccess(session);

  if (request.method === "POST" && !propertyId) {
    const body = await parseBody<Record<string, unknown>>(request);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO properties (id, owner_id, name, address, type, status, rent_amount, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      session.id,
      asString(body.name, "name"),
      asString(body.address, "address"),
      asString(body.type, "type"),
      asString(body.status, "status"),
      asNumber(body.rent_amount, "rent_amount"),
      asOptionalString(body.notes),
      now,
      now,
    ).run();

    const property = await assertPropertyAccess(env, session, id);
    return jsonResponse(request, env, mapProperty(property), 201);
  }

  if (!propertyId) {
    throw new HttpError(405, "Method not allowed");
  }

  const current = await assertPropertyAccess(env, session, propertyId);

  if (request.method === "PUT") {
    const body = await parseBody<Record<string, unknown>>(request);
    await env.DB.prepare(
      "UPDATE properties SET name = ?, address = ?, type = ?, status = ?, rent_amount = ?, notes = ?, updated_at = ? WHERE id = ?",
    ).bind(
      asString(body.name, "name"),
      asString(body.address, "address"),
      asString(body.type, "type"),
      asString(body.status, "status"),
      asNumber(body.rent_amount, "rent_amount"),
      asOptionalString(body.notes),
      new Date().toISOString(),
      propertyId,
    ).run();

    const updated = await assertPropertyAccess(env, session, propertyId);
    return jsonResponse(request, env, mapProperty(updated));
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM properties WHERE id = ?").bind(current.id).run();
    return emptyResponse(request, env);
  }

  throw new HttpError(405, "Method not allowed");
}

async function handleTenants(request: Request, env: Env, pathname: string) {
  const session = await requireSession(request, env);
  const segments = pathname.split("/").filter(Boolean);
  const tenantId = segments[2];

  if (request.method === "GET" && !tenantId) {
    return jsonResponse(request, env, await listTenants(env, session));
  }

  if (request.method === "GET" && tenantId) {
    const tenant = await getOwnedTenantRow(env, session, tenantId);
    if (!tenant) {
      throw new HttpError(404, "Tenant not found");
    }
    const property = await assertPropertyAccess(env, session, tenant.property_id);
    return jsonResponse(request, env, mapTenant({ ...tenant, property_name: property.name }));
  }

  await assertOwnerMutationAccess(session);

  if (request.method === "POST" && !tenantId) {
    const body = await parseBody<Record<string, unknown>>(request);
    const property = await assertPropertyAccess(env, session, asString(body.property_id, "property_id"));
    const activeTenant = await getActiveTenantForProperty(env, property.id);
    if (activeTenant) {
      throw new HttpError(409, "Property already has an active tenant");
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO tenants (id, owner_id, user_id, property_id, full_name, email, phone, lease_start, lease_end, monthly_rent, is_active, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      property.owner_id,
      null,
      property.id,
      asString(body.full_name, "full_name"),
      asOptionalString(body.email) ?? "",
      asString(body.phone, "phone"),
      asString(body.lease_start, "lease_start"),
      asString(body.lease_end, "lease_end"),
      asNumber(body.monthly_rent, "monthly_rent"),
      1,
      asOptionalString(body.notes),
      now,
      now,
    ).run();

    await syncPropertyStatus(env, property.id);
    const created = await getOwnedTenantRow(env, session, id);
    if (!created) {
      throw new HttpError(500, "Failed to create tenant");
    }
    return jsonResponse(request, env, mapTenant({ ...created, property_name: property.name }), 201);
  }

  if (!tenantId) {
    throw new HttpError(405, "Method not allowed");
  }

  const current = await getOwnedTenantRow(env, session, tenantId);
  if (!current) {
    throw new HttpError(404, "Tenant not found");
  }

  if (request.method === "PUT") {
    const body = await parseBody<Record<string, unknown>>(request);
    const nextProperty = await assertPropertyAccess(env, session, asString(body.property_id, "property_id"));
    const activeTenant = await getActiveTenantForProperty(env, nextProperty.id, tenantId);
    if (activeTenant) {
      throw new HttpError(409, "Property already has an active tenant");
    }

    await env.DB.prepare(
      "UPDATE tenants SET property_id = ?, full_name = ?, email = ?, phone = ?, lease_start = ?, lease_end = ?, monthly_rent = ?, notes = ?, updated_at = ? WHERE id = ?",
    ).bind(
      nextProperty.id,
      asString(body.full_name, "full_name"),
      asOptionalString(body.email) ?? "",
      asString(body.phone, "phone"),
      asString(body.lease_start, "lease_start"),
      asString(body.lease_end, "lease_end"),
      asNumber(body.monthly_rent, "monthly_rent"),
      asOptionalString(body.notes),
      new Date().toISOString(),
      tenantId,
    ).run();

    if (current.property_id !== nextProperty.id) {
      await syncPropertyStatus(env, current.property_id);
    }
    await syncPropertyStatus(env, nextProperty.id);

    const updated = await getOwnedTenantRow(env, session, tenantId);
    if (!updated) {
      throw new HttpError(500, "Failed to load updated tenant");
    }
    return jsonResponse(request, env, mapTenant({ ...updated, property_name: nextProperty.name }));
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(tenantId).run();
    await syncPropertyStatus(env, current.property_id);
    return emptyResponse(request, env);
  }

  throw new HttpError(405, "Method not allowed");
}

async function handlePayments(request: Request, env: Env, pathname: string) {
  const session = await requireSession(request, env);
  const segments = pathname.split("/").filter(Boolean);
  const paymentId = segments[2];

  if (request.method === "GET" && !paymentId) {
    return jsonResponse(request, env, await listPayments(env, session));
  }

  await assertOwnerMutationAccess(session);

  if (request.method === "POST" && !paymentId) {
    const body = await parseBody<Record<string, unknown>>(request);
    const property = await assertPropertyAccess(env, session, asString(body.property_id, "property_id"));
    const tenantId = asNullableId(body.tenant_id);
    const paidAt = asOptionalString(body.paid_at);
    const baseAmount = asNumber(body.base_amount, "base_amount");
    const utilitiesAmount = asNumber(body.utilities_amount, "utilities_amount");
    const totalAmount = baseAmount + utilitiesAmount;
    const dueDate = asString(body.due_date, "due_date");
    const status = computePaymentStatus(dueDate, paidAt);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO payments (id, property_id, tenant_id, payment_type, period_month, base_amount, utilities_amount, total_amount, due_date, paid_at, status, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      property.id,
      tenantId,
      asString(body.payment_type, "payment_type"),
      asString(body.period_month, "period_month"),
      baseAmount,
      utilitiesAmount,
      totalAmount,
      dueDate,
      paidAt,
      status,
      asOptionalString(body.note),
      now,
      now,
    ).run();

    const created = await getOwnedPaymentRow(env, session, id);
    if (!created) {
      throw new HttpError(500, "Failed to create payment");
    }
    return jsonResponse(request, env, mapPayment({ ...created, property_name: property.name }), 201);
  }

  if (!paymentId) {
    throw new HttpError(405, "Method not allowed");
  }

  const current = await getOwnedPaymentRow(env, session, paymentId);
  if (!current) {
    throw new HttpError(404, "Payment not found");
  }

  if (request.method === "PUT") {
    const body = await parseBody<Record<string, unknown>>(request);
    const property = await assertPropertyAccess(env, session, asString(body.property_id, "property_id"));
    const tenantId = asNullableId(body.tenant_id);
    const paidAt = asOptionalString(body.paid_at);
    const baseAmount = asNumber(body.base_amount, "base_amount");
    const utilitiesAmount = asNumber(body.utilities_amount, "utilities_amount");
    const totalAmount = baseAmount + utilitiesAmount;
    const dueDate = asString(body.due_date, "due_date");
    const status = computePaymentStatus(dueDate, paidAt);

    await env.DB.prepare(
      "UPDATE payments SET property_id = ?, tenant_id = ?, payment_type = ?, period_month = ?, base_amount = ?, utilities_amount = ?, total_amount = ?, due_date = ?, paid_at = ?, status = ?, note = ?, updated_at = ? WHERE id = ?",
    ).bind(
      property.id,
      tenantId,
      asString(body.payment_type, "payment_type"),
      asString(body.period_month, "period_month"),
      baseAmount,
      utilitiesAmount,
      totalAmount,
      dueDate,
      paidAt,
      status,
      asOptionalString(body.note),
      new Date().toISOString(),
      paymentId,
    ).run();

    const updated = await getOwnedPaymentRow(env, session, paymentId);
    if (!updated) {
      throw new HttpError(500, "Failed to load updated payment");
    }
    return jsonResponse(request, env, mapPayment({ ...updated, property_name: property.name }));
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM payments WHERE id = ?").bind(current.id).run();
    return emptyResponse(request, env);
  }

  throw new HttpError(405, "Method not allowed");
}

async function handleMeters(request: Request, env: Env, pathname: string) {
  const session = await requireSession(request, env);
  const segments = pathname.split("/").filter(Boolean);
  const meterId = segments[2];

  if (request.method === "GET" && !meterId) {
    return jsonResponse(request, env, await listMeters(env, session));
  }

  await assertOwnerMutationAccess(session);

  if (request.method === "POST" && !meterId) {
    const body = await parseBody<Record<string, unknown>>(request);
    const property = await assertPropertyAccess(env, session, asString(body.property_id, "property_id"));
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO meters (id, property_id, meter_type, unit, previous_reading, current_reading, tariff, reading_date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      property.id,
      asString(body.meter_type, "meter_type"),
      asString(body.unit, "unit"),
      asNumber(body.previous_reading, "previous_reading"),
      asNumber(body.current_reading, "current_reading"),
      asNumber(body.tariff, "tariff"),
      asString(body.reading_date, "reading_date"),
      asOptionalString(body.note),
      now,
      now,
    ).run();

    const created = await getOwnedMeterRow(env, session, id);
    if (!created) {
      throw new HttpError(500, "Failed to create meter reading");
    }
    return jsonResponse(request, env, mapMeter({ ...created, property_name: property.name }), 201);
  }

  if (!meterId) {
    throw new HttpError(405, "Method not allowed");
  }

  const current = await getOwnedMeterRow(env, session, meterId);
  if (!current) {
    throw new HttpError(404, "Meter reading not found");
  }

  if (request.method === "PUT") {
    const body = await parseBody<Record<string, unknown>>(request);
    const property = await assertPropertyAccess(env, session, asString(body.property_id, "property_id"));

    await env.DB.prepare(
      "UPDATE meters SET property_id = ?, meter_type = ?, unit = ?, previous_reading = ?, current_reading = ?, tariff = ?, reading_date = ?, note = ?, updated_at = ? WHERE id = ?",
    ).bind(
      property.id,
      asString(body.meter_type, "meter_type"),
      asString(body.unit, "unit"),
      asNumber(body.previous_reading, "previous_reading"),
      asNumber(body.current_reading, "current_reading"),
      asNumber(body.tariff, "tariff"),
      asString(body.reading_date, "reading_date"),
      asOptionalString(body.note),
      new Date().toISOString(),
      meterId,
    ).run();

    const updated = await getOwnedMeterRow(env, session, meterId);
    if (!updated) {
      throw new HttpError(500, "Failed to load updated meter reading");
    }
    return jsonResponse(request, env, mapMeter({ ...updated, property_name: property.name }));
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM meters WHERE id = ?").bind(current.id).run();
    return emptyResponse(request, env);
  }

  throw new HttpError(405, "Method not allowed");
}

async function handleTasks(request: Request, env: Env, pathname: string) {
  const session = await requireSession(request, env);
  const segments = pathname.split("/").filter(Boolean);
  const taskId = segments[2];

  if (request.method === "GET" && !taskId) {
    return jsonResponse(request, env, await listTasks(env, session));
  }

  await assertOwnerMutationAccess(session);

  if (request.method === "POST" && !taskId) {
    const body = await parseBody<Record<string, unknown>>(request);
    const property = await assertPropertyAccess(env, session, asString(body.property_id, "property_id"));
    const id = crypto.randomUUID();
    const dueDate = asString(body.due_date, "due_date");
    const status = computeTaskStatus(asString(body.status, "status"), dueDate);
    const now = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO tasks (id, property_id, tenant_id, title, description, priority, status, due_date, reminder_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      property.id,
      asNullableId(body.tenant_id),
      asString(body.title, "title"),
      asOptionalString(body.description),
      asString(body.priority, "priority"),
      status,
      dueDate,
      asOptionalString(body.reminder_at),
      status === "done" ? now : null,
      now,
      now,
    ).run();

    const created = await getOwnedTaskRow(env, session, id);
    if (!created) {
      throw new HttpError(500, "Failed to create task");
    }
    return jsonResponse(request, env, mapTask({ ...created, property_name: property.name }), 201);
  }

  if (!taskId) {
    throw new HttpError(405, "Method not allowed");
  }

  const current = await getOwnedTaskRow(env, session, taskId);
  if (!current) {
    throw new HttpError(404, "Task not found");
  }

  if (request.method === "PUT") {
    const body = await parseBody<Record<string, unknown>>(request);
    const property = await assertPropertyAccess(env, session, asString(body.property_id, "property_id"));
    const dueDate = asString(body.due_date, "due_date");
    const status = computeTaskStatus(asString(body.status, "status"), dueDate);
    const completedAt = status === "done" ? current.completed_at ?? new Date().toISOString() : null;

    await env.DB.prepare(
      "UPDATE tasks SET property_id = ?, tenant_id = ?, title = ?, description = ?, priority = ?, status = ?, due_date = ?, reminder_at = ?, completed_at = ?, updated_at = ? WHERE id = ?",
    ).bind(
      property.id,
      asNullableId(body.tenant_id),
      asString(body.title, "title"),
      asOptionalString(body.description),
      asString(body.priority, "priority"),
      status,
      dueDate,
      asOptionalString(body.reminder_at),
      completedAt,
      new Date().toISOString(),
      taskId,
    ).run();

    const updated = await getOwnedTaskRow(env, session, taskId);
    if (!updated) {
      throw new HttpError(500, "Failed to load updated task");
    }
    return jsonResponse(request, env, mapTask({ ...updated, property_name: property.name }));
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(current.id).run();
    return emptyResponse(request, env);
  }

  throw new HttpError(405, "Method not allowed");
}

async function routeRequest(request: Request, env: Env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/")) {
    throw new HttpError(404, "Not found");
  }

  if (request.method === "OPTIONS") {
    return emptyResponse(request, env, 200);
  }

  if (pathname === "/api/auth/register" && request.method === "POST") {
    return await handleRegister(request, env);
  }
  if (pathname === "/api/auth/login" && request.method === "POST") {
    return await handleLogin(request, env);
  }
  if (pathname === "/api/auth/me" && request.method === "GET") {
    return await handleMe(request, env);
  }
  if (pathname === "/api/profile" && request.method === "PUT") {
    return await handleProfile(request, env);
  }
  if (pathname.startsWith("/api/properties")) {
    return await handleProperties(request, env, pathname);
  }
  if (pathname.startsWith("/api/tenants")) {
    return await handleTenants(request, env, pathname);
  }
  if (pathname.startsWith("/api/payments")) {
    return await handlePayments(request, env, pathname);
  }
  if (pathname.startsWith("/api/meters")) {
    return await handleMeters(request, env, pathname);
  }
  if (pathname.startsWith("/api/tasks")) {
    return await handleTasks(request, env, pathname);
  }

  throw new HttpError(404, "Not found");
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        return errorResponse(request, env, error.status, error.message, error.details);
      }

      console.error(error);
      return errorResponse(request, env, 500, "Internal Server Error");
    }
  },
};
