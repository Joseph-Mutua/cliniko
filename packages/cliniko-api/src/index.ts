export type ClinikoEntity = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Appointment = ClinikoEntity & {
  patientId: string;
  startsAt: string;
  status: "booked" | "cancelled" | "completed";
  telehealthPatientLink?: string;
};

export type Invoice = ClinikoEntity & {
  patientId: string;
  totalCents: number;
  outstandingCents: number;
  status: "paid" | "partially_paid" | "unpaid";
};

export type TimelineEvent = ClinikoEntity & {
  patientId: string;
  type: "appointment" | "invoice" | "attachment" | "communication" | "form";
  label: string;
  occurredAt: string;
};

export class ClinikoApiClient {
  constructor(private readonly baseUrl: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async getJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Cliniko API request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }
}