import { NextResponse } from "next/server";
const bcrypt = require("bcryptjs");
import { prisma } from "@/lib/prisma";

// determine if email is accepted under accepted admin emails
function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  if (adminEmails.includes(email.toLowerCase())) {
    return true;
  }

//   // Check if email matches one of the admin domains
//   const adminDomains = process.env.ADMIN_EMAIL_DOMAINS?.split(',').map(d => d.trim().toLowerCase()) || [];
//   for (const domain of adminDomains) {
//     if (email.toLowerCase().endsWith(`@${domain}`)) {
//       return true;
//     }
//   }

  return false;
}

export async function POST(request: Request) {
    try {
        const { email, username, password } = await request.json();

        const existingUser = await prisma.account.findFirst({
            where: {
                OR: [
                    { email: email },
                ],
            },
        });

        if (existingUser) {
            let message = "Registration failed: ";
            if (existingUser.email === email) {
                message += "This email address is already registered.";
            }
            
            // Return a 409 status with the specific error message in the body
            return new NextResponse(JSON.stringify({ message: message }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Determine role based on email
        const role = isAdminEmail(email) ? 'admin' : 'patient';

        const newUser = await prisma.user.create({
            data: {
                name: username,
                role: role,
                account: {
                    create: {
                        email: email,
                        password: hashedPassword,
                    }
                }
            },
            include: {
                account: true
            }
        });
        
        const accounts = await prisma.account.findMany({
            select: {
                id: true,
                email: true,
                user_id: true,
                password: true,
            },
        });

        console.log(accounts)

        return NextResponse.json(
            {
                message: "Account created successfully",
                role: role
            },
            { status: 201 },
        );
    } catch (error) {
        console.error(error);
        return new NextResponse("Internal Server Error during registration", {
            status: 500,
        });
    }
}
