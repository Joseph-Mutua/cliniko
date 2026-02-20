import type { QueryClient, QueryKey } from "@tanstack/query-core";
import { qk } from "./keys";

export type Invalidation = {
  key: QueryKey;
};

export function onAttachmentUploaded(input: { patientId: string }): Invalidation[] {
  return [
    { key: qk.attachments(input.patientId) },
    { key: qk.patientTimelineRoot(input.patientId) },
    { key: qk.patientSummary(input.patientId) },
  ];
}

export function onFormSubmitted(input: { patientId: string; formId: string }): Invalidation[] {
  return [
    { key: qk.patientFormsRoot(input.patientId) },
    { key: qk.patientTimelineRoot(input.patientId) },
    { key: qk.formDraft(input.patientId, input.formId) },
  ];
}

export function onIntakeSent(input: { patientId: string }): Invalidation[] {
  return [{ key: qk.patientFormsRoot(input.patientId) }, { key: qk.patientTimelineRoot(input.patientId) }];
}

export function onPaymentRequested(input: { patientId: string }): Invalidation[] {
  return [
    { key: qk.patientInvoicesRoot(input.patientId) },
    { key: qk.invoicesSummary(input.patientId) },
    { key: qk.patientTimelineRoot(input.patientId) },
  ];
}

export function onAppointmentChangeRequested(input: { patientId: string; appointmentId: string }): Invalidation[] {
  return [
    { key: qk.appointment(input.appointmentId) },
    { key: qk.patientAppointmentsRoot(input.patientId) },
    { key: qk.patientTimelineRoot(input.patientId) },
  ];
}

export async function runInvalidations(client: QueryClient, invalidations: Invalidation[]): Promise<void> {
  await Promise.all(
    invalidations.map((entry) =>
      client.invalidateQueries({
        queryKey: entry.key,
        exact: false,
      }),
    ),
  );
}
