import { notFound } from "next/navigation";
import { PreviewDirectory } from "./PreviewDirectory";

/**
 * Dev-only "All pages" directory — the front door at /preview, linking the MGC mockup
 * flow, the component gallery, and the live app routes. Returns 404 in production so it
 * never ships as a public route; available locally via `npm run dev`.
 */
export default function PreviewPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <PreviewDirectory />;
}
