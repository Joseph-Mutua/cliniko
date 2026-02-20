import { useEffect, useMemo, useState } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { Link, Outlet, redirect, useLoaderData, useParams } from "react-router-dom";
import { createBrowserRouter, type LoaderFunctionArgs } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useVirtualizer } from "@tanstack/react-virtual";
import { qk } from "@cliniko-companion/cache";
import { readDraft, saveDraft } from "@cliniko-companion/forms";
import { Button, Card } from "@cliniko-companion/ui";
import { formatDate, formatMoney } from "@cliniko-companion/utils";
import { confirmUpload, createUploadSession, exchangeSession, getSession, type DynamicField } from "./api";
import {
  appointmentQuery,
  appointmentsQuery,
  attachmentsQuery,
  formDefinitionQuery,
  formsQuery,
  invoiceQuery,
  invoicesQuery,
  patientSummaryQuery,
  profileQuery,
  sessionQuery,
  telehealthQuery,
} from "./queries";
import { usePayInvoice, useRequestAppointmentChange, useSubmitForm, useUploadAttachment } from "./mutations";

type LoaderData = {
  patientId: string;
  tenantSlug: string;
};

async function requireSession(tenantSlug: string): Promise<{ patientId: string; tenantSlug: string }> {
  const session = await getSession();
  if (!session) {
    throw redirect(`/${tenantSlug}/entry?token=dev-token`);
  }
  return { patientId: session.patientId, tenantSlug: session.tenantSlug };
}

function tenantFromArgs(args: LoaderFunctionArgs): string {
  return args.params.tenantSlug ?? "demo";
}

async function homeLoader(queryClient: QueryClient, args: LoaderFunctionArgs): Promise<LoaderData> {
  const tenantSlug = tenantFromArgs(args);
  const { patientId } = await requireSession(tenantSlug);
  await Promise.all([
    queryClient.ensureQueryData(patientSummaryQuery(patientId)),
    queryClient.ensureQueryData(appointmentsQuery(patientId)),
    queryClient.ensureQueryData(formsQuery(patientId)),
    queryClient.ensureQueryData(invoicesQuery(patientId)),
  ]);
  return { patientId, tenantSlug };
}

function AppShell() {
  const { tenantSlug = "demo" } = useParams();

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Cliniko Companion</h1>
        <nav>
          <Link to={`/${tenantSlug}/home`}>Home</Link>
          <Link to={`/${tenantSlug}/appointments`}>Appointments</Link>
          <Link to={`/${tenantSlug}/forms`}>Forms</Link>
          <Link to={`/${tenantSlug}/billing`}>Billing</Link>
          <Link to={`/${tenantSlug}/uploads`}>Uploads</Link>
          <Link to={`/${tenantSlug}/settings`}>Settings</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <a href="#support">Support</a>
        <a href="#privacy">Privacy</a>
        <a href="#terms">Terms</a>
      </footer>
    </div>
  );
}

function EntryPage() {
  return (
    <Card title="Authorizing session" subtitle="Verifying magic link and preparing your portal.">
      <p>One moment while we finish sign-in.</p>
    </Card>
  );
}

function HomePage() {
  const { patientId } = useLoaderData() as LoaderData;
  const summary = useQuery(patientSummaryQuery(patientId));
  const appointments = useQuery(appointmentsQuery(patientId));
  const forms = useQuery(formsQuery(patientId));
  const invoices = useQuery(invoicesQuery(patientId));

  const nextAppointment = appointments.data?.find((item) => new Date(item.startsAt).getTime() > Date.now());
  const pendingForms = forms.data?.filter((item) => item.status === "pending") ?? [];
  const outstanding = invoices.data?.filter((item) => item.outstandingCents > 0) ?? [];

  return (
    <section className="grid two-up">
      <Card title={`Welcome, ${summary.data?.patientName ?? "Patient"}`} subtitle="Portal summary">
        <p>Outstanding invoices: {summary.data?.outstandingInvoiceCount ?? 0}</p>
        <p>No-show alerts: {summary.data?.noShows ?? 0}</p>
        <p>Upcoming recall: {summary.data?.upcomingRecall ? formatDate(summary.data.upcomingRecall) : "None"}</p>
      </Card>

      <Card title="Next appointment" subtitle="Join telehealth from this dashboard">
        {nextAppointment ? (
          <>
            <p>{formatDate(nextAppointment.startsAt)}</p>
            <p>{nextAppointment.location}</p>
            <Link className="inline-link" to={`../appointments/${nextAppointment.id}`}>
              Join telehealth
            </Link>
          </>
        ) : (
          <p>No upcoming appointments.</p>
        )}
      </Card>

      <Card title="Pending forms" subtitle="Finish before your visit">
        {pendingForms.length > 0 ? (
          pendingForms.map((form) => (
            <p key={form.id}>
              <Link className="inline-link" to={`../forms/${form.id}/fill`}>
                {form.title}
              </Link>
            </p>
          ))
        ) : (
          <p>You are all caught up.</p>
        )}
      </Card>

      <Card title="Billing" subtitle="Pay outstanding invoices">
        {outstanding.length > 0 ? (
          outstanding.map((invoice) => (
            <p key={invoice.id}>
              <Link className="inline-link" to={`../billing/${invoice.id}`}>
                {invoice.id} - {formatMoney(invoice.outstandingCents)} due
              </Link>
            </p>
          ))
        ) : (
          <p>No outstanding balances.</p>
        )}
      </Card>
    </section>
  );
}

function AppointmentsPage() {
  const { patientId } = useLoaderData() as LoaderData;
  const { data } = useQuery(appointmentsQuery(patientId));

  const [parentRef, setParentRef] = useState<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: data?.length ?? 0,
    getScrollElement: () => parentRef,
    estimateSize: () => 74,
    overscan: 5,
  });

  return (
    <Card title="Appointments" subtitle="Upcoming and past visits">
      <div ref={setParentRef} className="virtual-container">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const appointment = data?.[virtualRow.index];
            if (!appointment) {
              return null;
            }
            return (
              <article key={appointment.id} className="list-row" style={{ transform: `translateY(${virtualRow.start}px)` }}>
                <div>
                  <p>{formatDate(appointment.startsAt)}</p>
                  <small>{appointment.location}</small>
                </div>
                <Link to={`../appointments/${appointment.id}`}>View</Link>
              </article>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function AppointmentDetailPage() {
  const { patientId } = useLoaderData() as LoaderData;
  const { appointmentId = "" } = useParams();
  const appointment = useQuery(appointmentQuery(appointmentId));
  const telehealth = useQuery(telehealthQuery(appointmentId));
  const upload = useUploadAttachment(patientId);
  const reschedule = useRequestAppointmentChange(patientId);
  const [fileName, setFileName] = useState("pre-visit-note.pdf");

  return (
    <Card title="Appointment detail" subtitle="Preparation, telehealth, and uploads">
      <p>{appointment.data ? formatDate(appointment.data.startsAt) : "Loading..."}</p>
      <p>{appointment.data?.prepNotes}</p>
      <div className="actions-row">
        <a className="button-link" href={telehealth.data?.patientLink} target="_blank" rel="noreferrer">
          Join telehealth
        </a>
        <Button
          type="button"
          onClick={async () => {
            if (telehealth.data?.patientLink) {
              await navigator.clipboard.writeText(telehealth.data.patientLink);
            }
          }}
        >
          Copy telehealth link
        </Button>
      </div>
      <div className="upload-block">
        <label htmlFor="upload-name">Upload attachment</label>
        <input id="upload-name" value={fileName} onChange={(event) => setFileName(event.target.value)} />
        <Button type="button" onClick={() => upload.mutate(fileName)} disabled={upload.isPending}>
          {upload.isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>
      <Button type="button" onClick={() => reschedule.mutate(appointmentId)}>
        Request reschedule
      </Button>
    </Card>
  );
}

function FormsPage() {
  const { patientId } = useLoaderData() as LoaderData;
  const { data } = useQuery(formsQuery(patientId));

  return (
    <Card title="Forms" subtitle="Pending and completed">
      {data?.map((form) => (
        <article key={form.id} className="list-row static">
          <div>
            <p>{form.title}</p>
            <small>{form.status}</small>
          </div>
          <Link to={`../forms/${form.id}/fill`}>Open</Link>
        </article>
      ))}
    </Card>
  );
}

function schemaFromFields(fields: DynamicField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    if (field.type === "checkbox") {
      shape[field.id] = z.boolean();
    } else if (field.type === "number") {
      shape[field.id] = z.coerce.number();
    } else {
      shape[field.id] = z.string();
    }
    if (field.required) {
      shape[field.id] = shape[field.id].refine((value: unknown) => {
        if (typeof value === "boolean") {
          return value;
        }
        if (typeof value === "number") {
          return !Number.isNaN(value);
        }
        return String(value ?? "").trim().length > 0;
      }, "Required");
    }
  }
  return z.object(shape);
}

function FormFillPage() {
  const { patientId } = useLoaderData() as LoaderData;
  const { formId = "" } = useParams();
  const formDefinition = useQuery(formDefinitionQuery(formId));
  const submit = useSubmitForm(patientId, formId);

  const defaults = useMemo(() => {
    const fromDraft = readDraft<Record<string, unknown>>(patientId, formId);
    return fromDraft ?? (formDefinition.data?.values as Record<string, unknown> | undefined) ?? {};
  }, [patientId, formId, formDefinition.data?.values]);

  const schema = useMemo(() => schemaFromFields(formDefinition.data?.fields ?? []), [formDefinition.data?.fields]);

  const form = useForm<Record<string, unknown>>({
    values: defaults,
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      saveDraft(patientId, formId, values);
    });
    return () => subscription.unsubscribe();
  }, [form, patientId, formId]);

  if (!formDefinition.data) {
    return <Card title="Loading" subtitle="Fetching form" />;
  }

  return (
    <Card title={formDefinition.data.title} subtitle="Autosave enabled">
      <form onSubmit={form.handleSubmit((values) => submit.mutate(values))} className="dynamic-form">
        {formDefinition.data.fields.map((field) => {
          if (field.type === "textarea") {
            return (
              <label key={field.id}>
                {field.label}
                <textarea {...form.register(field.id)} />
              </label>
            );
          }
          if (field.type === "checkbox") {
            return (
              <label key={field.id} className="checkbox-row">
                <input type="checkbox" {...form.register(field.id)} />
                {field.label}
              </label>
            );
          }
          return (
            <label key={field.id}>
              {field.label}
              <input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                {...form.register(field.id)}
              />
            </label>
          );
        })}
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Submitting..." : "Submit form"}
        </Button>
      </form>
    </Card>
  );
}

function BillingPage() {
  const { patientId } = useLoaderData() as LoaderData;
  const { data } = useQuery(invoicesQuery(patientId));
  const pay = usePayInvoice(patientId);

  return (
    <Card title="Billing" subtitle="Outstanding invoices and payment status">
      {data?.map((invoice) => (
        <article key={invoice.id} className="list-row static">
          <div>
            <p>{invoice.id}</p>
            <small>{formatMoney(invoice.outstandingCents)} outstanding</small>
          </div>
          <div className="actions-row">
            <Link to={`../billing/${invoice.id}`}>Details</Link>
            {invoice.outstandingCents > 0 ? (
              <Button type="button" onClick={() => pay.mutate(invoice.id)}>
                Pay now
              </Button>
            ) : (
              <small>Paid</small>
            )}
          </div>
        </article>
      ))}
    </Card>
  );
}

function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const invoice = useQuery(invoiceQuery(invoiceId));

  return (
    <Card title={`Invoice ${invoiceId}`} subtitle="Line items and status">
      <p>Status: {invoice.data?.status}</p>
      <p>Outstanding: {formatMoney(invoice.data?.outstandingCents ?? 0)}</p>
      {invoice.data?.lineItems.map((item) => (
        <p key={item.id}>
          {item.label}: {formatMoney(item.amountCents)}
        </p>
      ))}
    </Card>
  );
}

function UploadsPage() {
  const { patientId } = useLoaderData() as LoaderData;
  const { data } = useQuery(attachmentsQuery(patientId));
  const [name, setName] = useState("insurance-card.jpg");
  const upload = useUploadAttachment(patientId);

  return (
    <Card title="Uploads" subtitle="Insurance docs, referrals, and progress images">
      <div className="actions-row">
        <input value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="button" onClick={() => upload.mutate(name)}>
          Upload file
        </Button>
      </div>
      {data?.map((attachment) => (
        <p key={attachment.id}>
          {attachment.name} ({formatDate(attachment.createdAt)})
        </p>
      ))}
    </Card>
  );
}

function SettingsPage() {
  const { patientId } = useLoaderData() as LoaderData;
  const profile = useQuery(profileQuery(patientId));

  return (
    <Card title="Settings" subtitle="Communication preferences and profile">
      <p>{profile.data?.name}</p>
      <p>{profile.data?.email}</p>
      <p>Preferred channel: {profile.data?.communication}</p>
    </Card>
  );
}

export function createPortalRouter(queryClient: QueryClient) {
  return createBrowserRouter([
    {
      path: "/",
      loader: async () => redirect("/demo/entry?token=dev-token"),
    },
    {
      path: "/:tenantSlug",
      element: <AppShell />,
      children: [
        {
          path: "entry",
          loader: async ({ params, request }) => {
            const tenantSlug = params.tenantSlug ?? "demo";
            const url = new URL(request.url);
            const token = url.searchParams.get("token");
            await exchangeSession(tenantSlug, token ?? "dev-token");
            await queryClient.prefetchQuery(sessionQuery);
            return redirect(`/${tenantSlug}/home`);
          },
          element: <EntryPage />,
        },
        {
          path: "home",
          loader: (args) => homeLoader(queryClient, args),
          element: <HomePage />,
        },
        {
          path: "appointments",
          loader: async (args) => {
            const tenantSlug = tenantFromArgs(args);
            const context = await requireSession(tenantSlug);
            await queryClient.ensureQueryData(appointmentsQuery(context.patientId));
            return context;
          },
          element: <AppointmentsPage />,
        },
        {
          path: "appointments/:appointmentId",
          loader: async (args) => {
            const tenantSlug = tenantFromArgs(args);
            const context = await requireSession(tenantSlug);
            const appointmentId = args.params.appointmentId ?? "";
            await Promise.all([
              queryClient.ensureQueryData(appointmentQuery(appointmentId)),
              queryClient.ensureQueryData(telehealthQuery(appointmentId)),
            ]);
            return context;
          },
          action: async ({ params, request }) => {
            const formData = await request.formData();
            const intent = String(formData.get("intent") ?? "");
            const appointmentId = params.appointmentId ?? "";
            const session = await getSession();
            if (!session) {
              return null;
            }
            if (intent === "upload") {
              const fileName = String(formData.get("fileName") ?? "attachment.jpg");
              const { uploadToken } = await createUploadSession(session.patientId, fileName);
              await confirmUpload(session.patientId, uploadToken, fileName);
            }
            if (intent === "join") {
              await queryClient.invalidateQueries({ queryKey: qk.appointmentTelehealth(appointmentId) });
            }
            return null;
          },
          element: <AppointmentDetailPage />,
        },
        {
          path: "forms",
          loader: async (args) => {
            const tenantSlug = tenantFromArgs(args);
            const context = await requireSession(tenantSlug);
            await queryClient.ensureQueryData(formsQuery(context.patientId));
            return context;
          },
          element: <FormsPage />,
        },
        {
          path: "forms/:formId/fill",
          loader: async (args) => {
            const tenantSlug = tenantFromArgs(args);
            const context = await requireSession(tenantSlug);
            const formId = args.params.formId ?? "";
            await queryClient.ensureQueryData(formDefinitionQuery(formId));
            return context;
          },
          element: <FormFillPage />,
        },
        {
          path: "billing",
          loader: async (args) => {
            const tenantSlug = tenantFromArgs(args);
            const context = await requireSession(tenantSlug);
            await queryClient.ensureQueryData(invoicesQuery(context.patientId));
            return context;
          },
          element: <BillingPage />,
        },
        {
          path: "billing/:invoiceId",
          loader: async (args) => {
            const tenantSlug = tenantFromArgs(args);
            const context = await requireSession(tenantSlug);
            const invoiceId = args.params.invoiceId ?? "";
            await queryClient.ensureQueryData(invoiceQuery(invoiceId));
            return context;
          },
          element: <InvoiceDetailPage />,
        },
        {
          path: "uploads",
          loader: async (args) => {
            const tenantSlug = tenantFromArgs(args);
            const context = await requireSession(tenantSlug);
            await queryClient.ensureQueryData(attachmentsQuery(context.patientId));
            return context;
          },
          action: async ({ request }) => {
            const formData = await request.formData();
            const fileName = String(formData.get("fileName") ?? "attachment.jpg");
            const session = await getSession();
            if (!session) {
              return null;
            }
            const { uploadToken } = await createUploadSession(session.patientId, fileName);
            await confirmUpload(session.patientId, uploadToken, fileName);
            return null;
          },
          element: <UploadsPage />,
        },
        {
          path: "settings",
          loader: async (args) => {
            const tenantSlug = tenantFromArgs(args);
            const context = await requireSession(tenantSlug);
            await queryClient.ensureQueryData(profileQuery(context.patientId));
            return context;
          },
          element: <SettingsPage />,
        },
      ],
    },
  ]);
}
