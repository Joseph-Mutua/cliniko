export type PatientSummary = {
  patientId: string;
  patientName: string;
  upcomingAppointments: number;
  outstandingInvoices: number;
  noShows: number;
  upcomingRecall: string;
  nextTelehealthPatientLink: string | null;
};

export type TimelineItem = {
  id: string;
  patientId: string;
  type: "appointment" | "invoice" | "attachment" | "communication" | "form";
  label: string;
  occurredAt: string;
};

export type FormTemplate = {
  id: string;
  title: string;
};

export type OutstandingInvoice = {
  id: string;
  patientId: string;
  outstandingCents: number;
};

export type AppointmentDetail = {
  id: string;
  patientId: string;
  startsAt: string;
  status: string;
  location: string;
  telehealthPractitionerLink: string;
  telehealthPatientLink: string;
  notes: string;
};

export type InvoiceDetail = {
  id: string;
  patientId: string;
  status: string;
  lineItems: Array<{ id: string; label: string; amountCents: number }>;
  outstandingCents: number;
};

const DB_KEY = "cc_patient_portal_db_v1";

type RawDb = {
  patient: { id: string; name: string };
  appointments: Array<{ id: string; patientId: string; startsAt: string; status: string; location: string }>;
  invoices: Array<{
    id: string;
    patientId: string;
    lineItems: Array<{ id: string; label: string; amountCents: number }>;
    outstandingCents: number;
    status: string;
  }>;
  forms: Array<{ id: string; patientId: string; title: string }>;
  attachments: Array<{ id: string; patientId: string; name: string }>;
  timeline: TimelineItem[];
};

function readDb(): RawDb {
  if (typeof window === "undefined" || !localStorage.getItem(DB_KEY)) {
    return {
      patient: { id: "pat_123", name: "Taylor Morgan" },
      appointments: [
        {
          id: "appt_1",
          patientId: "pat_123",
          startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: "booked",
          location: "Telehealth",
        },
      ],
      invoices: [
        {
          id: "inv_1",
          patientId: "pat_123",
          lineItems: [
            { id: "li_1", label: "Consultation", amountCents: 9000 },
            { id: "li_2", label: "Exercise Plan", amountCents: 3500 },
          ],
          outstandingCents: 12500,
          status: "unpaid",
        },
      ],
      forms: [{ id: "form_1", patientId: "pat_123", title: "Pre-Visit Intake" }],
      attachments: [],
      timeline: [
        {
          id: "ev_1",
          patientId: "pat_123",
          type: "appointment",
          label: "Upcoming telehealth appointment booked",
          occurredAt: new Date().toISOString(),
        },
      ],
    };
  }
  return JSON.parse(localStorage.getItem(DB_KEY) as string) as RawDb;
}

function writeDb(db: RawDb): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function event(patientId: string, type: TimelineItem["type"], label: string): TimelineItem {
  return {
    id: `ev_${crypto.randomUUID()}`,
    patientId,
    type,
    label,
    occurredAt: new Date().toISOString(),
  };
}

export async function parseEntryParams(url: string): Promise<{ patientId: string; clinic: string }> {
  const params = new URL(url).searchParams;
  return {
    patientId: params.get("patient_id") ?? "pat_123",
    clinic: params.get("clinic") ?? "demo-clinic",
  };
}

export async function getPatientSummary(patientId: string): Promise<PatientSummary> {
  const db = readDb();
  const nextAppointment = db.appointments
    .filter((item) => item.patientId === patientId && new Date(item.startsAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  return {
    patientId,
    patientName: db.patient.name,
    upcomingAppointments: db.appointments.filter((item) => new Date(item.startsAt).getTime() > Date.now()).length,
    outstandingInvoices: db.invoices.filter((item) => item.outstandingCents > 0).length,
    noShows: 1,
    upcomingRecall: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    nextTelehealthPatientLink: nextAppointment ? `https://telehealth.example.com/patient/${nextAppointment.id}` : null,
  };
}

export async function getTimeline(patientId: string): Promise<TimelineItem[]> {
  const db = readDb();
  return db.timeline
    .filter((item) => item.patientId === patientId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export async function getFormTemplates(): Promise<FormTemplate[]> {
  const db = readDb();
  return db.forms.map((form) => ({ id: form.id, title: form.title }));
}

export async function getOutstandingInvoices(patientId: string): Promise<OutstandingInvoice[]> {
  const db = readDb();
  return db.invoices
    .filter((invoice) => invoice.patientId === patientId && invoice.outstandingCents > 0)
    .map((invoice) => ({
      id: invoice.id,
      patientId: invoice.patientId,
      outstandingCents: invoice.outstandingCents,
    }));
}

export async function sendIntake(patientId: string, templateId: string): Promise<void> {
  const db = readDb();
  db.timeline.unshift(event(patientId, "communication", `Intake ${templateId} sent to patient`));
  writeDb(db);
}

export async function sendPaymentLink(patientId: string, invoiceId: string): Promise<void> {
  const db = readDb();
  db.timeline.unshift(event(patientId, "communication", `Payment request sent for ${invoiceId}`));
  writeDb(db);
}

export async function uploadAttachment(patientId: string, fileName: string): Promise<void> {
  const db = readDb();
  db.attachments.unshift({
    id: `att_${crypto.randomUUID()}`,
    patientId,
    name: fileName,
  });
  db.timeline.unshift(event(patientId, "attachment", `Attachment uploaded: ${fileName}`));
  writeDb(db);
}

export async function addNoteStub(patientId: string, note: string): Promise<void> {
  const db = readDb();
  db.timeline.unshift(event(patientId, "communication", `Note stub added: ${note}`));
  writeDb(db);
}

export async function getAppointmentDetail(appointmentId: string): Promise<AppointmentDetail> {
  const db = readDb();
  const appointment = db.appointments.find((item) => item.id === appointmentId);
  if (!appointment) {
    throw new Error("Appointment not found");
  }
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    startsAt: appointment.startsAt,
    status: appointment.status,
    location: appointment.location,
    telehealthPractitionerLink: `https://telehealth.example.com/practitioner/${appointment.id}`,
    telehealthPatientLink: `https://telehealth.example.com/patient/${appointment.id}`,
    notes: "Patient reports better range of motion week-on-week.",
  };
}

export async function getInvoiceDetail(invoiceId: string): Promise<InvoiceDetail> {
  const db = readDb();
  const invoice = db.invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  return {
    id: invoice.id,
    patientId: invoice.patientId,
    status: invoice.status,
    lineItems: invoice.lineItems,
    outstandingCents: invoice.outstandingCents,
  };
}
