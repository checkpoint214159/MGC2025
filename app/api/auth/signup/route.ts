import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getDevAdminId } from "@/lib/dev/init";

// determine if email is accepted under accepted admin emails
function isAdminEmail(email: string): boolean {
    const adminEmails =
        process.env.ADMIN_EMAILS?.split(",").map((e) =>
            e.trim().toLowerCase(),
        ) || [];
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
                OR: [{ email: email }],
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
                headers: { "Content-Type": "application/json" },
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine role based on email
        const role = isAdminEmail(email) ? "admin" : "patient";

        // Neon HTTP has no transactions — even a `create` with a nested relation `create`
        // is rejected (it's two INSERTs across tables). Create the rows separately; if the
        // second fails, compensate by deleting the orphaned user (no transaction to roll back).
        const newUser = await prisma.user.create({
            data: {
                name: username,
                role: role,
            },
        });

        try {
            await prisma.account.create({
                data: {
                    email: email,
                    password: hashedPassword,
                    user_id: newUser.id,
                },
            });
        } catch (e) {
            await prisma.user
                .delete({ where: { id: newUser.id } })
                .catch(() => {});
            throw e;
        }

        // Auto-assign patient to dev admin in development mode
        if (process.env.NODE_ENV === "development" && role === "patient") {
            const devAdminId = await getDevAdminId();
            if (devAdminId) {
                try {
                    await prisma.adminPatientRelation.create({
                        data: {
                            adminId: devAdminId,
                            patientId: newUser.id,
                        },
                    });
                    console.warn(
                        `[DEV] ⚠️  Auto-assigned patient "${email}" to dev admin`,
                    );
                } catch (error: unknown) {
                    // Silently ignore if relation already exists
                    if ((error as { code?: string }).code !== "P2002") {
                        console.error(
                            "[DEV] Failed to auto-assign patient to dev admin:",
                            error,
                        );
                    }
                }
            }
        }

        const accounts = await prisma.account.findMany({
            select: {
                id: true,
                email: true,
                user_id: true,
                password: true,
            },
        });

        console.log(accounts);

        return NextResponse.json(
            {
                message: "Account created successfully",
                role: role,
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
