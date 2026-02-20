import { queryOptions } from "@tanstack/react-query";
import { qk, staleTimes } from "@cliniko-companion/cache";
import {
  getAppointment,
  getFormDefinition,
  getPatientSummary,
  getProfile,
  getTelehealthLink,
  getInvoice,
  listAppointments,
  listAttachments,
  listForms,
  listInvoices,
} from "./api";

export const sessionQuery = queryOptions({
  queryKey: qk.session(),
  queryFn: async () => {
    const module = await import("./api");
    return module.getSession();
  },
  staleTime: staleTimes.session,
});

export const patientSummaryQuery = (patientId: string) =>
  queryOptions({
    queryKey: qk.patientSummary(patientId),
    queryFn: () => getPatientSummary(patientId),
    staleTime: staleTimes.patientSummary,
  });

export const appointmentsQuery = (patientId: string) =>
  queryOptions({
    queryKey: qk.appointments({ patientId }),
    queryFn: () => listAppointments(patientId),
    staleTime: staleTimes.appointment,
  });

export const appointmentQuery = (appointmentId: string) =>
  queryOptions({
    queryKey: qk.appointment(appointmentId),
    queryFn: () => getAppointment(appointmentId),
    staleTime: staleTimes.appointment,
  });

export const telehealthQuery = (appointmentId: string) =>
  queryOptions({
    queryKey: qk.appointmentTelehealth(appointmentId),
    queryFn: () => getTelehealthLink(appointmentId),
    staleTime: staleTimes.telehealth,
  });

export const formsQuery = (patientId: string) =>
  queryOptions({
    queryKey: qk.forms(patientId),
    queryFn: () => listForms(patientId),
    staleTime: staleTimes.patientSummary,
  });

export const formDefinitionQuery = (formId: string) =>
  queryOptions({
    queryKey: qk.formDefinition(formId),
    queryFn: () => getFormDefinition(formId),
    staleTime: staleTimes.formDefinition,
  });

export const invoicesQuery = (patientId: string) =>
  queryOptions({
    queryKey: qk.invoices({ patientId }),
    queryFn: () => listInvoices(patientId),
    staleTime: staleTimes.invoices,
  });

export const invoiceQuery = (invoiceId: string) =>
  queryOptions({
    queryKey: qk.invoice(invoiceId),
    queryFn: () => getInvoice(invoiceId),
    staleTime: staleTimes.invoices,
  });

export const attachmentsQuery = (patientId: string) =>
  queryOptions({
    queryKey: qk.attachments(patientId),
    queryFn: () => listAttachments(patientId),
    staleTime: staleTimes.patientSummary,
  });

export const profileQuery = (patientId: string) =>
  queryOptions({
    queryKey: qk.patient(patientId),
    queryFn: () => getProfile(patientId),
    staleTime: staleTimes.patientSummary,
  });
