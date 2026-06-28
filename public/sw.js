// Service worker: handles incoming Web Push events and shows OS-level notifications.

self.addEventListener("push", (event) => {
    let data = { title: "Recovery update", body: "", url: "/" };
    try {
        data = { ...data, ...JSON.parse(event.data?.text() ?? "{}") };
    } catch {}

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            data: { url: data.url },
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url ?? "/";
    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((list) => {
                const existing = list.find((c) => c.url.includes(url));
                if (existing) return existing.focus();
                return clients.openWindow(url);
            }),
    );
});
