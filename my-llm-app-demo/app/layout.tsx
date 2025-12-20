import { SessionProvider } from "next-auth/react"
import './globals.css'; // Assuming this is where your Tailwind CSS is imported

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                {/* This {children} prop will be filled by EITHER:
                  1. The (app)/layout.tsx (which includes the Sidebar/AuthProvider)
                  2. OR The (auth)/layout.tsx (which includes the simple auth wrapper)
                */}
                <SessionProvider>{children}</SessionProvider>
            </body>
        </html>
    );
}