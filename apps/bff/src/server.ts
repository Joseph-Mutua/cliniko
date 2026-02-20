import { randomUUID } from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import { logInfo } from "@cliniko-companion/utils";
import { verifyMagicLinkToken } from "@cliniko-companion/auth";

const app = express();

const PORT = Number(process.env.PORT ?? 4000);
const SESSION_COOKIE = "cc_portal_session";
const PORTAL_SESSION_SECRET = process.env.PORTAL_SESSION_SECRET ?? "dev-secret";
const MAGIC_LINK_TTL_SECONDS = Number(process.env.MAGIC_LINK_TTL_SECONDS ?? 900);
const CLINIKO_API_BASE_URL = process.env.CLINIKO_API_BASE_URL ?? "https://api.cliniko.com/v1";
const CLINIKO_API_KEY = process.env.CLINIKO_API_KEY ?? "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const sessions = new Map<string, { patientId: string; tenantSlug: string; createdAt: number }>();
const auditLog: Array<{ id: string; type: string; actor: string; at: string; payload: Record<string, unknown> }> = [];

function queryFromRequest(query: express.Request["query"]): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item));
      }
    } else if (value != null) {
      search.set(key, String(value));
    }
  }
  return search;
}

function readCollection(value: unknown, keys: string[]): Array<Record<string, unknown>> | null {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const payload = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
  }
  return null;
}

async function tryClinikoRequest<T>(path: string, query?: URLSearchParams): Promise<T | null> {
  if (!CLINIKO_API_KEY) {
    return null;
  }

  const authorizationValue =
    CLINIKO_API_KEY.startsWith("Bearer ") || CLINIKO_API_KEY.startsWith("Basic ")
      ? CLINIKO_API_KEY
      : `Bearer ${CLINIKO_API_KEY}`;
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, CLINIKO_API_BASE_URL.endsWith("/") ? CLINIKO_API_BASE_URL : `${CLINIKO_API_BASE_URL}/`);
  if (query) {
    url.search = query.toString();
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authorizationValue,
      },
    });

    if (!response.ok) {
      logInfo("cliniko.request.failed", { path, status: response.status });
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    logInfo("cliniko.request.error", {
      path,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    credentials: true,
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https:"],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.post("/session/exchange", (req, res) => {
  const schema = z.object({ token: z.string().min(1), tenantSlug: z.string().min(1).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const fallbackTenant = parsed.data.tenantSlug ?? "demo";
  const verified = verifyMagicLinkToken(parsed.data.token, PORTAL_SESSION_SECRET);
  const devPayload =
    !IS_PRODUCTION && parsed.data.token === "dev-token"
      ? ({
          patientId: "pat_123",
          tenantSlug: fallbackTenant,
          expiresAt: Date.now() + MAGIC_LINK_TTL_SECONDS * 1000,
        } as const)
      : null;
  const payload = verified ?? devPayload;

  if (!payload) {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (payload.expiresAt < Date.now()) {
    return res.status(401).json({ error: "Token expired" });
  }

  const sessionId = randomUUID();
  sessions.set(sessionId, { patientId: payload.patientId, tenantSlug: payload.tenantSlug, createdAt: Date.now() });
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    maxAge: MAGIC_LINK_TTL_SECONDS * 1000,
  });

  return res.json({
    ok: true,
    patientId: payload.patientId,
    tenantSlug: payload.tenantSlug,
  });
});

app.get("/session/me", (req, res) => {
  const sessionId = req.cookies[SESSION_COOKIE] as string | undefined;
  if (!sessionId) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: "Session expired" });
  }
  return res.json(session);
});

function requireSession(req: express.Request, res: express.Response): { patientId: string; tenantSlug: string } | null {
  const sessionId = req.cookies[SESSION_COOKIE] as string | undefined;
  if (!sessionId) {
    res.status(401).json({ error: "Unauthenticated" });
    return null;
  }
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(401).json({ error: "Session expired" });
    return null;
  }
  return session;
}

app.get("/cliniko/patients/:id/summary", async (req, res) => {
  const session = requireSession(req, res);
  if (!session) {
    return;
  }
  const patient = await tryClinikoRequest<Record<string, unknown>>(`/patients/${req.params.id}`);
  const invoicesPayload = await tryClinikoRequest<unknown>(`/invoices`, new URLSearchParams({ patient_id: req.params.id }));
  const invoiceItems = readCollection(invoicesPayload, ["invoices", "items", "data"]) ?? [];

  const patientName =
    (typeof patient?.["full_name"] === "string" && patient["full_name"]) ||
    (typeof patient?.["name"] === "string" && patient["name"]) ||
    "Taylor Morgan";

  const outstandingInvoices = invoiceItems.filter((invoice) => Number(invoice["outstanding_amount"] ?? invoice["outstandingCents"] ?? 0) > 0).length;

  res.json({
    patientId: req.params.id,
    patientName,
    noShows: 1,
    outstandingInvoices,
    upcomingRecall: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    tenantSlug: session.tenantSlug,
  });
});

app.get("/cliniko/patients/:id/timeline", async (req, res) => {
  if (!requireSession(req, res)) {
    return;
  }
  const appointmentsPayload = await tryClinikoRequest<unknown>(
    `/appointments`,
    new URLSearchParams({ patient_id: req.params.id }),
  );
  const appointmentItems = readCollection(appointmentsPayload, ["appointments", "items", "data"]);

  const liveItems =
    appointmentItems?.slice(0, 6).map((appointment, index) => ({
      id: String(appointment["id"] ?? `ev_live_${index}`),
      patientId: req.params.id,
      type: "appointment",
      label: `Appointment ${String(appointment["appointment_type"] ?? "event")}`,
      occurredAt: String(appointment["starts_at"] ?? new Date().toISOString()),
    })) ?? null;

  res.json({
    cursor: req.query.cursor ?? null,
    items:
      liveItems ??
      [
        {
          id: "ev_1",
          patientId: req.params.id,
          type: "appointment",
          label: "Upcoming telehealth appointment booked",
          occurredAt: new Date().toISOString(),
        },
      ],
  });
});

app.get("/cliniko/appointments", async (req, res) => {
  if (!requireSession(req, res)) {
    return;
  }
  const query = queryFromRequest(req.query);

  const appointmentsPayload = await tryClinikoRequest<unknown>(`/appointments`, query);
  const appointments = readCollection(appointmentsPayload, ["appointments", "items", "data"]);
  if (appointments) {
    return res.json({ filters: req.query, items: appointments });
  }

  res.json({
    filters: req.query,
    items: [
      {
        id: "appt_1",
        patientId: "pat_123",
        startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        status: "booked",
      },
    ],
  });
});

app.get("/cliniko/invoices", async (req, res) => {
  if (!requireSession(req, res)) {
    return;
  }
  const query = queryFromRequest(req.query);

  const invoicesPayload = await tryClinikoRequest<unknown>(`/invoices`, query);
  const invoices = readCollection(invoicesPayload, ["invoices", "items", "data"]);
  if (invoices) {
    return res.json({ filters: req.query, items: invoices });
  }

  res.json({
    filters: req.query,
    items: [{ id: "inv_1", patientId: "pat_123", outstandingCents: 12500, status: "unpaid" }],
  });
});

app.get("/cliniko/appointments/:id/telehealth-links", async (req, res) => {
  if (!requireSession(req, res)) {
    return;
  }

  const appointment = await tryClinikoRequest<Record<string, unknown>>(`/appointments/${req.params.id}`);
  const practitionerLink = appointment?.["telehealth_url"] ?? appointment?.["telehealth_practitioner_url"];
  const patientLink = appointment?.["telehealth_patient_url"] ?? appointment?.["telehealth_url"];
  if (typeof practitionerLink === "string" && typeof patientLink === "string") {
    return res.json({
      appointmentId: req.params.id,
      practitionerLink,
      patientLink,
    });
  }

  res.json({
    appointmentId: req.params.id,
    practitionerLink: `https://telehealth.example.com/practitioner/${req.params.id}`,
    patientLink: `https://telehealth.example.com/patient/${req.params.id}`,
  });
});

app.post("/cliniko/patients/:id/attachments/presign", (req, res) => {
  if (!requireSession(req, res)) {
    return;
  }
  const schema = z.object({ fileName: z.string().min(1), contentType: z.string().min(1).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  return res.json({
    uploadUrl: `https://s3.example.com/upload/${randomUUID()}`,
    method: "PUT",
    requiredHeaders: {
      "content-type": parsed.data.contentType ?? "application/octet-stream",
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    },
    uploadToken: randomUUID(),
  });
});

app.post("/cliniko/patients/:id/attachments/confirm", (req, res) => {
  if (!requireSession(req, res)) {
    return;
  }
  const schema = z.object({ uploadToken: z.string().min(1), fileName: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  return res.json({
    attachmentId: `att_${randomUUID()}`,
    patientId: req.params.id,
    fileName: parsed.data.fileName,
    uploadedAt: new Date().toISOString(),
  });
});

app.post("/audit/events", (req, res) => {
  const schema = z.object({
    type: z.string().min(1),
    actor: z.string().min(1),
    payload: z.record(z.unknown()).default({}),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const entry = {
    id: randomUUID(),
    type: parsed.data.type,
    actor: parsed.data.actor,
    at: new Date().toISOString(),
    payload: parsed.data.payload,
  };
  auditLog.push(entry);
  logInfo("audit.event", entry);
  return res.status(201).json(entry);
});

app.get("/audit/events", (_req, res) => {
  res.json({ items: auditLog.slice(-100) });
});

app.listen(PORT, () => {
  logInfo("bff.started", { port: PORT, clinikoApiConfigured: Boolean(CLINIKO_API_KEY) });
});
