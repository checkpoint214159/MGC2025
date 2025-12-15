import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

async function authorize(credentials: Record<string, string> | undefined) {
    // 1. Check if credentials were provided
    if (!credentials?.username || !credentials.password) {
        return null;
    }

    // --- Replace this Mock Logic with Your Database Check ---

    // 2. Fetch user from your database based on username
    // const user = await db.getUserByUsername(credentials.username);

    // 3. Verify the hashed password against the password provided in credentials
    // if (!user || !await bcrypt.compare(credentials.password, user.hashedPassword)) {
    //     return null; // Invalid credentials
    // }

    // **MOCK IMPLEMENTATION FOR DEMO PURPOSES**
    // Allows any user/pass for now, but logs the credentials for debugging
    console.log(
        "Attempting login with:",
        credentials.username,
        credentials.password,
    );

    if (
        credentials.username === "demo" &&
        credentials.password === "password"
    ) {
        // Return a simple user object if credentials are valid
        return {
            id: "12345",
            name: "Demo User",
            email: "demo@app.com",
            role: "authenticated", // Add roles for access control
        };
    } else {
        return null; // Authentication failed
    }
}

// **Auth.js Configuration Object**
const authOptions = {
    // Configure one or more authentication providers
    debug: process.env.NODE_ENV !== "production", // Add this line
    providers: [
        CredentialsProvider({
            // The name to display on the sign-in form (e.g. "Sign in with...")
            name: "Credentials",
            // The credentials property defines the fields on the sign-in form
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            // The async authorize function contains your core verification logic
            authorize: authorize,
        }),
        // ...add other providers like GoogleProvider if needed later
    ],
    // Pages configuration tells Auth.js where your custom login page is located
    pages: {
        signIn: "/login", // Redirects unauthenticated users to this page
    },
    // Optional: Add session management and callbacks if needed
};

// **Export the necessary GET and POST handlers**
// Auth.js uses the same handler for both GET (e.g., getting session status)
// and POST (e.g., submitting the login form) requests.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
