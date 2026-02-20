import { z } from "zod";

export const dynamicFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "number", "date", "textarea", "checkbox"]),
  required: z.boolean().default(false),
});

export const dynamicFormSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  fields: z.array(dynamicFieldSchema),
});

export type DynamicForm = z.infer<typeof dynamicFormSchema>;

export function draftKey(patientId: string, formId: string): string {
  return `draft:${patientId}:${formId}`;
}

export function saveDraft(patientId: string, formId: string, payload: unknown): void {
  const key = draftKey(patientId, formId);
  localStorage.setItem(key, JSON.stringify(payload));
}

export function readDraft<T>(patientId: string, formId: string): T | null {
  const raw = localStorage.getItem(draftKey(patientId, formId));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as T;
}

export function clearDraft(patientId: string, formId: string): void {
  localStorage.removeItem(draftKey(patientId, formId));
}