"use client";

import { useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const raw = atob(base64);
    return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Mounts silently in the patient layout. On first load (once per browser):
 *   1. Registers /sw.js as the service worker.
 *   2. Requests notification permission if not yet decided.
 *   3. Subscribes to Web Push and POSTs the subscription to /api/notifications/subscribe.
 * No UI — the permission prompt is the only user-visible interaction.
 */
export function PushSubscriber() {
    useEffect(() => {
        if (
            typeof window === "undefined" ||
            !("serviceWorker" in navigator) ||
            !("PushManager" in window) ||
            !VAPID_PUBLIC_KEY
        ) {
            return;
        }

        (async () => {
            try {
                const reg = await navigator.serviceWorker.register("/sw.js");

                const permission = await Notification.requestPermission();
                if (permission !== "granted") return;

                // Re-use an existing subscription if one already exists.
                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    sub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey:
                            urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                    });
                }

                await fetch("/api/notifications/subscribe", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(sub.toJSON()),
                });
            } catch (err) {
                // Non-fatal — the app works fine without push.
                console.warn("[push] subscription failed:", err);
            }
        })();
    }, []);

    return null;
}
