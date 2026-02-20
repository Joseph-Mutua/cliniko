import { useMutation, useQueryClient } from "@tanstack/react-query";
import { onAttachmentUploaded, onIntakeSent, onPaymentRequested, qk, runInvalidations } from "@cliniko-companion/cache";
import { addNoteStub, sendIntake, sendPaymentLink, uploadAttachment } from "./api";

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
  const timelineKey = qk.patientTimelineRoot(patientId);

  return useMutation({
    mutationFn: (templateId: string) => sendIntake(patientId, templateId),
    onMutate: async (templateId) => {
      const previous = queryClient.getQueriesData({ queryKey: timelineKey });
      await queryClient.cancelQueries({ queryKey: timelineKey });
      queryClient.setQueriesData({ queryKey: timelineKey }, (old: any[] | undefined) => [
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
      await runInvalidations(queryClient, onIntakeSent({ patientId }));
    },
  });
}

export function useSendPaymentLink(patientId: string) {
  const queryClient = useQueryClient();
  const timelineKey = qk.patientTimelineRoot(patientId);

  return useMutation({
    mutationFn: (invoiceId: string) => sendPaymentLink(patientId, invoiceId),
    onMutate: async (invoiceId) => {
      const previous = queryClient.getQueriesData({ queryKey: timelineKey });
      await queryClient.cancelQueries({ queryKey: timelineKey });
      queryClient.setQueriesData({ queryKey: timelineKey }, (old: any[] | undefined) => [
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
  const timelineKey = qk.patientTimelineRoot(patientId);

  return useMutation({
    mutationFn: (fileName: string) => uploadAttachment(patientId, fileName),
    onMutate: async (fileName) => {
      const previous = queryClient.getQueriesData({ queryKey: timelineKey });
      await queryClient.cancelQueries({ queryKey: timelineKey });
      queryClient.setQueriesData({ queryKey: timelineKey }, (old: any[] | undefined) => [
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

export function useAddNoteStub(patientId: string) {
  const queryClient = useQueryClient();
  const timelineKey = qk.patientTimelineRoot(patientId);

  return useMutation({
    mutationFn: (note: string) => addNoteStub(patientId, note),
    onMutate: async (note) => {
      const previous = queryClient.getQueriesData({ queryKey: timelineKey });
      await queryClient.cancelQueries({ queryKey: timelineKey });
      queryClient.setQueriesData({ queryKey: timelineKey }, (old: any[] | undefined) => [
        optimisticTimelineEvent(patientId, `Note stub added: ${note}`),
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (_error, _note, context) => {
      context?.previous.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
    },
    onSuccess: async () => {
      await runInvalidations(queryClient, [{ key: timelineKey }]);
    },
  });
}
