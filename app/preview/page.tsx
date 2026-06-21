import { notFound } from "next/navigation";
import { PreviewGallery } from "./PreviewGallery";

/**
 * Dev-only component gallery for the engagement revamp. Returns 404 in production
 * so it never ships as a public route; available locally via `npm run dev` at
 * http://localhost:3000/preview .
 */
export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewGallery />;
}
