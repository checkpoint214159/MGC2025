import { NextResponse } from "next/server";
const bcrypt = require("bcryptjs");
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    /**
     * Handles validation and posting to database
     * uses prisma ORM, since I am a db newbie and refuse to learn sql to do allat
     * better for use case too, since vercel offers it off the shelf
     */
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
        const newUser = await prisma.user.create({
            data: {
                name: username,
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
