export const qk = {
  session: () => ["session"] as const,

  patient: (patientId: string) => ["patient", patientId] as const,
  patientSummary: (patientId: string) => ["patient", patientId, "summary"] as const,

  appointments: (filters: Record<string, unknown>) => ["appointments", filters] as const,
  appointment: (appointmentId: string) => ["appointment", appointmentId] as const,
  appointmentTelehealth: (appointmentId: string) => ["appointment", appointmentId, "telehealth"] as const,

  invoices: (filters: Record<string, unknown>) => ["invoices", filters] as const,
  invoice: (invoiceId: string) => ["invoice", invoiceId] as const,
  invoicesSummary: (patientId: string) => ["patient", patientId, "invoices", "summary"] as const,

  forms: (patientId: string) => ["patient", patientId, "forms"] as const,
  formDefinition: (formId: string) => ["form", formId, "definition"] as const,
  formDraft: (patientId: string, formId: string) => ["patient", patientId, "form", formId, "draft"] as const,

  attachments: (patientId: string) => ["patient", patientId, "attachments"] as const,

  timeline: (patientId: string, params: Record<string, unknown>) =>
    ["patient", patientId, "timeline", params] as const,
};

export const staleTimes = {
  session: 5 * 60 * 1000,
  patientSummary: 2 * 60 * 1000,
  timeline: 60 * 1000,
  appointment: 2 * 60 * 1000,
  telehealth: 5 * 60 * 1000,
  invoices: 2 * 60 * 1000,
  formDefinition: 24 * 60 * 60 * 1000,
} as const;