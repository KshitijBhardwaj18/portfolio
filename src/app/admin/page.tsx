import type { Metadata } from "next";
import { Suspense } from "react";
import { Admin } from "@/components/admin/admin";

// The editor runs entirely in the browser. In production, Cloudflare Access
// guards this page and the /api it talks to (see ADMIN.md).
export const metadata: Metadata = {
  title: "Admin · Kshitij Bhardwaj",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense>
      <Admin />
    </Suspense>
  );
}
