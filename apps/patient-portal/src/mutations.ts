import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  onAppointmentChangeRequested,
  onAttachmentUploaded,
  onFormSubmitted,
  onPaymentRequested,
  runInvalidations,
} from "@cliniko-companion/cache";
import { clearDraft } from "@cliniko-companion/forms";
import { confirmUpload, createUploadSession, payInvoice, requestAppointmentChange, submitForm } from "./api";

export function useUploadAttachment(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileName: string) => {
      const { uploadToken } = await createUploadSession(patientId, fileName);
      return confirmUpload(patientId, uploadToken, fileName);
    },
    onSuccess: async () => {
      await runInvalidations(queryClient, onAttachmentUploaded({ patientId }));
    },
  });
}

export function useSubmitForm(patientId: string, formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      await submitForm(patientId, formId, values);
      clearDraft(patientId, formId);
    },
    onSuccess: async () => {
      await runInvalidations(queryClient, onFormSubmitted({ patientId, formId }));
    },
  });
}

export function usePayInvoice(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: payInvoice,
    onSuccess: async () => {
      await runInvalidations(queryClient, onPaymentRequested({ patientId }));
    },
  });
}

export function useRequestAppointmentChange(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      await requestAppointmentChange(appointmentId);
      return appointmentId;
    },
    onSuccess: async (appointmentId) => {
      await runInvalidations(queryClient, onAppointmentChangeRequested({ patientId, appointmentId }));
    },
  });
}
