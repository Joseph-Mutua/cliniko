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

const sessions = new Map<string, { patientId: string; tenantSlug: string; createdAt: number }>();
const auditLog: Array<{ id: string; type: string; actor: string; at: string; payload: Record<string, unknown> }> = [];

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
  const payload =
    verified ??
    ({
      patientId: "pat_123",
      tenantSlug: fallbackTenant,
      expiresAt: Date.now() + MAGIC_LINK_TTL_SECONDS * 1000,
    } as const);

  if (payload.expiresAt < Date.now()) {
    return res.status(401).json({ error: "Token expired" });
  }

  const sessionId = randomUUID();
  sessions.set(sessionId, { patientId: payload.patientId, tenantSlug: payload.tenantSlug, createdAt: Date.now() });
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
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

app.get("/cliniko/patients/:id/summary", (req, res) => {
  const session = requireSession(req, res);
  if (!session) {
    return;
  }
  res.json({
    patientId: req.params.id,
    patientName: "Taylor Morgan",
    noShows: 1,
    outstandingInvoices: 1,
    upcomingRecall: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    tenantSlug: session.tenantSlug,
  });
});

app.get("/cliniko/patients/:id/timeline", (req, res) => {
  if (!requireSession(req, res)) {
    return;
  }
  res.json({
    cursor: req.query.cursor ?? null,
    items: [
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

app.get("/cliniko/appointments", (req, res) => {
  if (!requireSession(req, res)) {
    return;
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

app.get("/cliniko/invoices", (req, res) => {
  if (!requireSession(req, res)) {
    return;
  }
  res.json({
    filters: req.query,
    items: [{ id: "inv_1", patientId: "pat_123", outstandingCents: 12500, status: "unpaid" }],
  });
});

app.get("/cliniko/appointments/:id/telehealth-links", (req, res) => {
  if (!requireSession(req, res)) {
    return;
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
  logInfo("bff.started", { port: PORT });
});
