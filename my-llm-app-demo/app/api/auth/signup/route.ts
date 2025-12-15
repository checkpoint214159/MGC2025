import { NextResponse } from "next/server";
const bcrypt = require("bcrypt");
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const { email, username, password } = await request.json();

        const existingUser = await prisma.account.findFirst({
            where: {
                OR: [
                    { email: email },
                    { user_id: username },
                ],
            },
        });

        if (existingUser) {
            let message = "Registration failed: ";
            if (existingUser.email === email) {
                message += "This email address is already registered.";
            } else if (existingUser.user_id === username) {
                message += "This username is already taken.";
            }
            
            // Return a 409 status with the specific error message in the body
            return new NextResponse(JSON.stringify({ message: message }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.account.create({
            data: {
                email: email,
                user_id: username,
                password: hashedPassword,
            },
        });
        
        const accounts = await prisma.account.findMany({
            select: {
                id: true,
                email: true,
                user_id: true,
            },
        });

        console.log(accounts)

        return NextResponse.json(
            {
                message: "Account created successfully",
                user: { id: newUser.id, email: newUser.email },
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
