import { SessionProvider } from "next-auth/react"
import { cookies } from 'next/headers';
import { DateProvider } from '@/context/DateContext';
import './globals.css';

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Get the sticky note (cookie) from the browser
    const cookieStore = await cookies();
    const simulatedDate = cookieStore.get('dev-simulated-date')?.value;
    // 2. Determine the initial date for the whole app
    const initialDate = simulatedDate || new Date().toISOString();

    return (
        <html lang="en">
            <body>
                {/* We pass the server-fetched date into the DateProvider.
                  Now the Client-side context starts with the EXACT same date
                  the server used to fetch the Session or Prisma data.
                */}
                <DateProvider initialDate={initialDate}>
                    <SessionProvider>
                        {children}
                    </SessionProvider>
                </DateProvider>
            </body>
        </html>
    );
}