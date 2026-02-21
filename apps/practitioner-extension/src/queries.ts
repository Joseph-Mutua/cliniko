import { queryOptions } from "@tanstack/react-query";
import { qk, staleTimes } from "@cliniko-companion/cache";
import {
  getAppointmentDetail,
  getFormTemplates,
  getInvoiceDetail,
  getOutstandingInvoices,
  getPatientSummary,
  getTimeline,
} from "./api";

export const patientSummaryQuery = (patientId: string) =>
  queryOptions({
    queryKey: qk.patientSummary(patientId),
    queryFn: () => getPatientSummary(patientId),
    staleTime: staleTimes.patientSummary,
  });

export const timelineQuery = (patientId: string, params: Record<string, unknown> = {}) =>
  queryOptions({
    queryKey: qk.timeline(patientId, params),
    queryFn: () => getTimeline(patientId),
    staleTime: staleTimes.timeline,
  });

export const formTemplatesQuery = () =>
  queryOptions({
    queryKey: qk.formTemplates(),
    queryFn: () => getFormTemplates(),
    staleTime: staleTimes.formDefinition,
  });

export const outstandingInvoicesQuery = (patientId: string) =>
  queryOptions({
    queryKey: qk.invoices({ patientId, status: "outstanding" }),
    queryFn: () => getOutstandingInvoices(patientId),
    staleTime: staleTimes.invoices,
  });

export const appointmentDetailQuery = (appointmentId: string) =>
  queryOptions({
    queryKey: qk.appointment(appointmentId),
    queryFn: () => getAppointmentDetail(appointmentId),
    staleTime: staleTimes.appointment,
  });

export const invoiceDetailQuery = (invoiceId: string) =>
  queryOptions({
    queryKey: qk.invoice(invoiceId),
    queryFn: () => getInvoiceDetail(invoiceId),
    staleTime: staleTimes.invoices,
  });
