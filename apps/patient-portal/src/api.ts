export type PortalSession = {
  tenantSlug: string;
  patientId: string;
  patientName: string;
  createdAt: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  startsAt: string;
  location: string;
  status: "booked" | "completed" | "cancelled";
  prepNotes?: string;
  telehealthPatientLink: string;
};

export type Invoice = {
  id: string;
  patientId: string;
  issuedAt: string;
  lineItems: Array<{ id: string; label: string; amountCents: number }>;
  totalCents: number;
  outstandingCents: number;
  status: "unpaid" | "partially_paid" | "paid";
};

export type DynamicField = {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "checkbox";
  required?: boolean;
};

export type IntakeForm = {
  id: string;
  patientId: string;
  title: string;
  status: "pending" | "completed";
  updatedAt: string;
  fields: DynamicField[];
  values?: Record<string, unknown>;
};

export type Attachment = {
  id: string;
  patientId: string;
  name: string;
  url: string;
  createdAt: string;
};

export type TimelineEvent = {
  id: string;
  patientId: string;
  type: "appointment" | "invoice" | "attachment" | "communication" | "form";
  label: string;
  occurredAt: string;
};

export type PatientProfile = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  communication: "sms" | "email";
};

export type DemoDb = {
  patient: PatientProfile;
  appointments: Appointment[];
  invoices: Invoice[];
  forms: IntakeForm[];
  attachments: Attachment[];
  timeline: TimelineEvent[];
};

const DB_KEY = "cc_patient_portal_db_v1";
const SESSION_KEY = "cc_patient_portal_session";

const defaultDb: DemoDb = {
  patient: {
    id: "pat_123",
    name: "Taylor Morgan",
    email: "taylor@example.com",
    mobile: "+1 555-0100",
    communication: "sms",
  },
  appointments: [
    {
      id: "appt_1",
      patientId: "pat_123",
      startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Telehealth",
      status: "booked",
      prepNotes: "Bring your latest mobility tracker summary.",
      telehealthPatientLink: "https://telehealth.example.com/visit/appt_1",
    },
    {
      id: "appt_2",
      patientId: "pat_123",
      startsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Clinic Room 2",
      status: "completed",
      prepNotes: "Follow-up on shoulder rehabilitation.",
      telehealthPatientLink: "https://telehealth.example.com/visit/appt_2",
    },
  ],
  invoices: [
    {
      id: "inv_1",
      patientId: "pat_123",
      issuedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems: [
        { id: "li_1", label: "Consultation", amountCents: 9000 },
        { id: "li_2", label: "Exercise Plan", amountCents: 3500 },
      ],
      totalCents: 12500,
      outstandingCents: 12500,
      status: "unpaid",
    },
  ],
  forms: [
    {
      id: "form_1",
      patientId: "pat_123",
      title: "Pre-Visit Intake",
      status: "pending",
      updatedAt: new Date().toISOString(),
      fields: [
        { id: "pain_level", label: "Pain level (1-10)", type: "number", required: true },
        { id: "symptoms", label: "Current symptoms", type: "textarea", required: true },
        { id: "injury_date", label: "Date symptoms started", type: "date" },
        { id: "consent", label: "I consent to treatment", type: "checkbox", required: true },
      ],
    },
  ],
  attachments: [],
  timeline: [
    {
      id: "ev_1",
      patientId: "pat_123",
      type: "appointment",
      label: "Upcoming telehealth appointment booked",
      occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ev_2",
      patientId: "pat_123",
      type: "invoice",
      label: "Invoice inv_1 issued",
      occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

let serverMemory = structuredClone(defaultDb);

function browserStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readDb(): DemoDb {
  if (!browserStorageAvailable()) {
    return serverMemory;
  }
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultDb));
    return structuredClone(defaultDb);
  }
  return JSON.parse(raw) as DemoDb;
}

function writeDb(db: DemoDb): void {
  if (!browserStorageAvailable()) {
    serverMemory = db;
    return;
  }
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function readSession(): PortalSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as PortalSession;
}

function writeSession(session: PortalSession): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function timelineEvent(patientId: string, type: TimelineEvent["type"], label: string): TimelineEvent {
  return {
    id: `ev_${crypto.randomUUID()}`,
    patientId,
    type,
    label,
    occurredAt: new Date().toISOString(),
  };
}

export async function exchangeSession(tenantSlug: string, token: string | null): Promise<PortalSession> {
  if (!token) {
    throw new Error("Missing magic link token");
  }
  const db = readDb();
  const session: PortalSession = {
    tenantSlug,
    patientId: db.patient.id,
    patientName: db.patient.name,
    createdAt: new Date().toISOString(),
  };
  writeSession(session);
  return session;
}

export async function getSession(): Promise<PortalSession | null> {
  return readSession();
}

export async function getPatientSummary(patientId: string): Promise<{
  patientId: string;
  patientName: string;
  noShows: number;
  outstandingInvoiceCount: number;
  upcomingRecall: string | null;
}> {
  const db = readDb();
  return {
    patientId,
    patientName: db.patient.name,
    noShows: 1,
    outstandingInvoiceCount: db.invoices.filter((invoice) => invoice.outstandingCents > 0).length,
    upcomingRecall: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getTimeline(patientId: string): Promise<TimelineEvent[]> {
  const db = readDb();
  return db.timeline
    .filter((event) => event.patientId === patientId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export async function listAppointments(patientId: string): Promise<Appointment[]> {
  const db = readDb();
  return db.appointments
    .filter((appointment) => appointment.patientId === patientId)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function getAppointment(appointmentId: string): Promise<Appointment> {
  const db = readDb();
  const item = db.appointments.find((appointment) => appointment.id === appointmentId);
  if (!item) {
    throw new Error("Appointment not found");
  }
  return item;
}

export async function getTelehealthLink(appointmentId: string): Promise<{ patientLink: string }> {
  const appointment = await getAppointment(appointmentId);
  return { patientLink: appointment.telehealthPatientLink };
}

export async function requestAppointmentChange(appointmentId: string): Promise<void> {
  const db = readDb();
  const appointment = db.appointments.find((item) => item.id === appointmentId);
  if (!appointment) {
    throw new Error("Appointment not found");
  }
  db.timeline.unshift(
    timelineEvent(appointment.patientId, "communication", `Change request submitted for ${appointment.id}`),
  );
  writeDb(db);
}

export async function listForms(patientId: string): Promise<IntakeForm[]> {
  const db = readDb();
  return db.forms.filter((form) => form.patientId === patientId);
}

export async function getFormDefinition(formId: string): Promise<IntakeForm> {
  const db = readDb();
  const form = db.forms.find((item) => item.id === formId);
  if (!form) {
    throw new Error("Form not found");
  }
  return form;
}

export async function submitForm(patientId: string, formId: string, values: Record<string, unknown>): Promise<void> {
  const db = readDb();
  const idx = db.forms.findIndex((form) => form.id === formId);
  if (idx === -1) {
    throw new Error("Form not found");
  }
  db.forms[idx] = {
    ...db.forms[idx],
    status: "completed",
    values,
    updatedAt: new Date().toISOString(),
  };
  db.timeline.unshift(timelineEvent(patientId, "form", `Submitted form ${db.forms[idx].title}`));
  writeDb(db);
}

export async function listInvoices(patientId: string): Promise<Invoice[]> {
  const db = readDb();
  return db.invoices.filter((invoice) => invoice.patientId === patientId);
}

export async function getInvoice(invoiceId: string): Promise<Invoice> {
  const db = readDb();
  const invoice = db.invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  return invoice;
}

export async function payInvoice(invoiceId: string): Promise<void> {
  const db = readDb();
  const idx = db.invoices.findIndex((invoice) => invoice.id === invoiceId);
  if (idx === -1) {
    throw new Error("Invoice not found");
  }
  db.invoices[idx] = {
    ...db.invoices[idx],
    outstandingCents: 0,
    status: "paid",
  };
  db.timeline.unshift(
    timelineEvent(db.invoices[idx].patientId, "invoice", `Payment received for ${db.invoices[idx].id}`),
  );
  writeDb(db);
}

export async function listAttachments(patientId: string): Promise<Attachment[]> {
  const db = readDb();
  return db.attachments.filter((attachment) => attachment.patientId === patientId);
}

export async function createUploadSession(
  patientId: string,
  fileName: string,
): Promise<{ uploadToken: string; uploadUrl: string }> {
  return {
    uploadToken: `${patientId}:${fileName}:${Date.now()}`,
    uploadUrl: "https://s3.example.com/presigned",
  };
}

export async function confirmUpload(patientId: string, uploadToken: string, fileName: string): Promise<Attachment> {
  const db = readDb();
  const attachment: Attachment = {
    id: `att_${crypto.randomUUID()}`,
    patientId,
    name: fileName,
    url: `https://files.example.com/${encodeURIComponent(uploadToken)}`,
    createdAt: new Date().toISOString(),
  };
  db.attachments.unshift(attachment);
  db.timeline.unshift(timelineEvent(patientId, "attachment", `Uploaded attachment ${fileName}`));
  writeDb(db);
  return attachment;
}

export async function getProfile(patientId: string): Promise<PatientProfile> {
  const db = readDb();
  if (db.patient.id !== patientId) {
    throw new Error("Patient not found");
  }
  return db.patient;
}
