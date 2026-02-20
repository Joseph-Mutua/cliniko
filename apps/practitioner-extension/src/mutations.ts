import { useMutation, useQueryClient } from "@tanstack/react-query";
import { onAttachmentUploaded, onPaymentRequested, runInvalidations } from "@cliniko-companion/cache";
import { sendIntake, sendPaymentLink, uploadAttachment } from "./api";

function optimisticTimelineEvent(patientId: string, label: string) {
  return {
    id: `optimistic_${Date.now()}`,
    patientId,
    type: "communication" as const,
    label,
    occurredAt: new Date().toISOString(),
  };
}

export function useSendIntake(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => sendIntake(patientId, templateId),
    onMutate: async (templateId) => {
      const key = ["patient", patientId, "timeline"] as const;
      const previous = queryClient.getQueriesData({ queryKey: key });
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueriesData({ queryKey: key }, (old: any[] | undefined) => [
        optimisticTimelineEvent(patientId, `Intake ${templateId} sent`),
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (_error, _templateId, context) => {
      context?.previous.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
    },
    onSuccess: async () => {
      await runInvalidations(queryClient, [{ key: ["patient", patientId, "forms"] }, { key: ["patient", patientId, "timeline"] }]);
    },
  });
}

export function useSendPaymentLink(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => sendPaymentLink(patientId, invoiceId),
    onMutate: async (invoiceId) => {
      const key = ["patient", patientId, "timeline"] as const;
      const previous = queryClient.getQueriesData({ queryKey: key });
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueriesData({ queryKey: key }, (old: any[] | undefined) => [
        optimisticTimelineEvent(patientId, `Payment request sent for ${invoiceId}`),
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (_error, _invoiceId, context) => {
      context?.previous.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
    },
    onSuccess: async () => {
      await runInvalidations(queryClient, onPaymentRequested({ patientId }));
    },
  });
}

export function useUploadAttachment(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileName: string) => uploadAttachment(patientId, fileName),
    onMutate: async (fileName) => {
      const key = ["patient", patientId, "timeline"] as const;
      const previous = queryClient.getQueriesData({ queryKey: key });
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueriesData({ queryKey: key }, (old: any[] | undefined) => [
        optimisticTimelineEvent(patientId, `Attachment upload queued: ${fileName}`),
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (_error, _fileName, context) => {
      context?.previous.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
    },
    onSuccess: async () => {
      await runInvalidations(queryClient, onAttachmentUploaded({ patientId }));
    },
  });
}
