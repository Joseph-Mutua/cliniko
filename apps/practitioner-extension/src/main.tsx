import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { createExtensionRouter } from "./router";
import "@cliniko-companion/ui/theme.css";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
    },
  },
});

const router = createExtensionRouter(queryClient);

function RuntimeBindings() {
  useEffect(() => {
    const channel = new BroadcastChannel("cliniko-companion-portal");
    channel.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["patient"] });
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["patient"] });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RuntimeBindings />
    </QueryClientProvider>
  </StrictMode>,
);
