export const metadata = {
    title: "Login", // Change title to something specific
    description: "Login page for the application",
};

// 1. Remove <html> and <body> tags.
// 2. The default export is now a standard React component that returns a wrapping div.
export default function LoginLayout({
    // Rename for clarity, if you like
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // This div provides the centering/styling for the login form, inheriting styling from above
        <div className="flex flex-col items-center justify-center min-h-screen">
            {children}
        </div>
    );
}
