import { PreviewDirectory } from "./PreviewDirectory";

/**
 * "All pages" directory — the front door at /preview, linking the Wally journey, the MGC
 * mockup flow, the component gallery, and the live app routes. Publicly reachable so the
 * demo flow can be shown on the deployed site (mock data only, no backend behind it).
 */
export default function PreviewPage() {
    return <PreviewDirectory />;
}
