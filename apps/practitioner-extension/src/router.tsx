import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { Link, Outlet, redirect, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { createBrowserRouter, type LoaderFunctionArgs } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button, Card } from "@cliniko-companion/ui";
import { formatDate, formatMoney } from "@cliniko-companion/utils";
import { parseEntryParams } from "./api";
import {
  appointmentDetailQuery,
  formTemplatesQuery,
  invoiceDetailQuery,
  outstandingInvoicesQuery,
  patientSummaryQuery,
  timelineQuery,
} from "./queries";
import { useAddNoteStub, useSendIntake, useSendPaymentLink, useUploadAttachment } from "./mutations";

type PatientRouteContext = {
  patientId: string;
};

function ExtensionLayout() {
  const { patientId = "pat_123" } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const commands = useMemo(
    () => [
      { label: "Timeline", path: `/patients/${patientId}/timeline` },
      { label: "Send intake", path: `/patients/${patientId}/actions/send-intake` },
      { label: "Request payment", path: `/patients/${patientId}/actions/request-payment` },
      { label: "Upload attachment", path: `/patients/${patientId}/actions/upload-attachment` },
    ],
    [patientId],
  );

  return (
    <div className="ext-shell">
      <header className="ext-topbar">
        <div className="ext-topbar-inner">
          <div className="ext-brand">
            <p className="ext-kicker">Clinician Workspace</p>
            <h1>Companion Practitioner Extension</h1>
          </div>
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            Ctrl+K
          </Button>
        </div>
        <nav className="ext-nav">
          <Link to={`/patients/${patientId}/timeline`}>Timeline</Link>
          <Link to={`/patients/${patientId}/actions/send-intake`}>Send intake</Link>
          <Link to={`/patients/${patientId}/actions/request-payment`}>Request payment</Link>
          <Link to={`/patients/${patientId}/actions/upload-attachment`}>Upload</Link>
        </nav>
      </header>
      <main className="ext-main">
        <Outlet />
      </main>
      {open ? (
        <div className="command-overlay" role="dialog" aria-label="Command palette">
          <div className="command-panel">
            <input ref={inputRef} placeholder="Type command..." />
            <div className="command-list">
              {commands.map((command) => (
                <button
                  key={command.path}
                  type="button"
                  onClick={() => {
                    navigate(command.path);
                    setOpen(false);
                  }}
                >
                  {command.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimelinePage() {
  const { patientId } = useLoaderData() as PatientRouteContext;
  const summary = useQuery(patientSummaryQuery(patientId));
  const timeline = useQuery(timelineQuery(patientId, { pageSize: 30 }));
  const addNote = useAddNoteStub(patientId);
  const [noteText, setNoteText] = useState("Follow-up call required");

  const [parentRef, setParentRef] = useState<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: timeline.data?.length ?? 0,
    getScrollElement: () => parentRef,
    estimateSize: () => 72,
    overscan: 6,
  });

  return (
    <section className="timeline-grid">
      <Card
        title={summary.data?.patientName ?? "Patient"}
        subtitle="Unified timeline"
        kicker="Patient activity"
        className="timeline-card"
      >
        <div ref={setParentRef} className="virtual-container">
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = timeline.data?.[virtualRow.index];
              if (!item) {
                return null;
              }
              return (
                <article key={item.id} className="row" style={{ transform: `translateY(${virtualRow.start}px)` }}>
                  <p>{item.label}</p>
                  <small>{formatDate(item.occurredAt)}</small>
                </article>
              );
            })}
          </div>
        </div>
      </Card>
      <Card title="Quick actions" subtitle="High-frequency workflows" kicker="Command rail" className="action-card">
        <p className="action-link-row">
          <Link to={`/patients/${patientId}/actions/send-intake`}>Send intake</Link>
        </p>
        <p className="action-link-row">
          <Link to={`/patients/${patientId}/actions/request-payment`}>Send payment request</Link>
        </p>
        <p className="action-link-row">
          <Link to={`/patients/${patientId}/actions/upload-attachment`}>Upload attachment</Link>
        </p>
        <div className="action-row">
          <Button
            type="button"
            onClick={async () => {
              if (summary.data?.nextTelehealthPatientLink) {
                await navigator.clipboard.writeText(summary.data.nextTelehealthPatientLink);
              }
            }}
          >
            Copy telehealth link
          </Button>
        </div>
        <div className="action-row">
          <input value={noteText} onChange={(event) => setNoteText(event.target.value)} aria-label="Note stub" />
          <Button type="button" variant="ghost" onClick={() => addNote.mutate(noteText)} disabled={addNote.isPending}>
            Add note stub
          </Button>
        </div>
        <p className="alert-line">
          Alerts: <strong>{summary.data?.noShows ?? 0}</strong> no-show(s),{" "}
          <strong>{summary.data?.outstandingInvoices ?? 0}</strong> outstanding invoice(s), recall{" "}
          <strong>{summary.data?.upcomingRecall ? formatDate(summary.data.upcomingRecall) : "none"}</strong>
        </p>
      </Card>
    </section>
  );
}

function SendIntakePage() {
  const { patientId } = useLoaderData() as PatientRouteContext;
  const templates = useQuery(formTemplatesQuery());
  const mutation = useSendIntake(patientId);

  return (
    <Card title="Send intake" subtitle="Choose template and send quickly" kicker="Patient outreach">
      {templates.data?.map((template) => (
        <div key={template.id} className="action-row">
          <span className="action-title">{template.title}</span>
          <Button type="button" onClick={() => mutation.mutate(template.id)}>
            Send
          </Button>
        </div>
      ))}
    </Card>
  );
}

function RequestPaymentPage() {
  const { patientId } = useLoaderData() as PatientRouteContext;
  const invoices = useQuery(outstandingInvoicesQuery(patientId));
  const mutation = useSendPaymentLink(patientId);

  return (
    <Card title="Request payment" subtitle="Send invoice reminder links" kicker="Billing outreach">
      {invoices.data?.map((invoice) => (
        <div key={invoice.id} className="action-row">
          <span className="action-title">
            {invoice.id} ({formatMoney(invoice.outstandingCents)})
          </span>
          <Button type="button" onClick={() => mutation.mutate(invoice.id)}>
            Send link
          </Button>
        </div>
      ))}
    </Card>
  );
}

function UploadAttachmentPage() {
  const { patientId } = useLoaderData() as PatientRouteContext;
  const mutation = useUploadAttachment(patientId);
  const [name, setName] = useState("progress-photo.jpg");

  return (
    <Card title="Upload attachment" subtitle="Presigned upload workflow" kicker="Clinical documents">
      <div className="action-row">
        <input value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="button" onClick={() => mutation.mutate(name)}>
          Upload
        </Button>
      </div>
    </Card>
  );
}

function AppointmentDrillPage() {
  const { appointmentId = "" } = useParams();
  const appointment = useQuery(appointmentDetailQuery(appointmentId));

  return (
    <Card title="Appointment drill-down" subtitle="Telehealth links and notes" kicker="Appointment context">
      <div className="detail-stack">
        <p>
          Start time: <strong>{formatDate(appointment.data?.startsAt ?? Date.now())}</strong>
        </p>
        <p>
          Location: <strong>{appointment.data?.location}</strong>
        </p>
        <p>{appointment.data?.notes}</p>
      </div>
      <div className="detail-links">
        <a href={appointment.data?.telehealthPractitionerLink} target="_blank" rel="noreferrer">
          Practitioner telehealth link
        </a>
        <a href={appointment.data?.telehealthPatientLink} target="_blank" rel="noreferrer">
          Patient telehealth link
        </a>
      </div>
    </Card>
  );
}

function InvoiceDrillPage() {
  const { invoiceId = "" } = useParams();
  const invoice = useQuery(invoiceDetailQuery(invoiceId));

  return (
    <Card title="Invoice drill-down" subtitle="Status and line items" kicker="Billing detail">
      <div className="detail-stack">
        <p>
          Status: <strong>{invoice.data?.status}</strong>
        </p>
        <p>
          Outstanding: <strong>{formatMoney(invoice.data?.outstandingCents ?? 0)}</strong>
        </p>
      </div>
      <div className="line-item-list">
        {invoice.data?.lineItems.map((item) => (
          <p key={item.id}>
            <span>{item.label}</span>
            <strong>{formatMoney(item.amountCents)}</strong>
          </p>
        ))}
      </div>
    </Card>
  );
}

async function patientLoader(queryClient: QueryClient, args: LoaderFunctionArgs) {
  const patientId = args.params.patientId ?? "pat_123";
  await queryClient.ensureQueryData(patientSummaryQuery(patientId));
  return { patientId };
}

export function createExtensionRouter(queryClient: QueryClient) {
  return createBrowserRouter([
    {
      path: "/",
      loader: async () => redirect("/entry?patient_id=pat_123&clinic=demo-clinic"),
    },
    {
      path: "/entry",
      loader: async ({ request }) => {
        const { patientId } = await parseEntryParams(request.url);
        await Promise.all([
          queryClient.prefetchQuery(patientSummaryQuery(patientId)),
          queryClient.prefetchQuery(timelineQuery(patientId, { pageSize: 30 })),
          queryClient.prefetchQuery(formTemplatesQuery()),
          queryClient.prefetchQuery(outstandingInvoicesQuery(patientId)),
        ]);
        return redirect(`/patients/${patientId}/timeline`);
      },
    },
    {
      path: "/patients/:patientId",
      element: <ExtensionLayout />,
      children: [
        {
          path: "timeline",
          loader: async (args) => {
            const data = await patientLoader(queryClient, args);
            await queryClient.ensureQueryData(timelineQuery(data.patientId, { pageSize: 30 }));
            return data;
          },
          element: <TimelinePage />,
        },
        {
          path: "actions/send-intake",
          loader: async (args) => {
            const data = await patientLoader(queryClient, args);
            await queryClient.ensureQueryData(formTemplatesQuery());
            return data;
          },
          action: async () => null,
          element: <SendIntakePage />,
        },
        {
          path: "actions/request-payment",
          loader: async (args) => {
            const data = await patientLoader(queryClient, args);
            await queryClient.ensureQueryData(outstandingInvoicesQuery(data.patientId));
            return data;
          },
          action: async () => null,
          element: <RequestPaymentPage />,
        },
        {
          path: "actions/upload-attachment",
          loader: (args) => patientLoader(queryClient, args),
          action: async () => null,
          element: <UploadAttachmentPage />,
        },
        {
          path: "appointments/:appointmentId",
          loader: async (args) => {
            const data = await patientLoader(queryClient, args);
            const appointmentId = args.params.appointmentId ?? "";
            await queryClient.ensureQueryData(appointmentDetailQuery(appointmentId));
            return data;
          },
          element: <AppointmentDrillPage />,
        },
        {
          path: "invoices/:invoiceId",
          loader: async (args) => {
            const data = await patientLoader(queryClient, args);
            const invoiceId = args.params.invoiceId ?? "";
            await queryClient.ensureQueryData(invoiceDetailQuery(invoiceId));
            return data;
          },
          element: <InvoiceDrillPage />,
        },
      ],
    },
  ]);
}
