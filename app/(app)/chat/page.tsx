"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";

export default function ChatComponent() {
    const router = useRouter();
    const { status } = useSession();
    const [input, setInput] = useState("");
    const { messages, sendMessage } = useChat();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center text-ink-muted">
                Checking authentication…
            </div>
        );
    }

    return (
        <div className="stretch mx-auto flex h-screen w-full max-w-md flex-col bg-bg p-4">
            <div className="my-6 text-center">
                <h1 className="text-xl font-semibold text-ink">
                    Chat with Wally
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                    Questions about your recovery, any time
                </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pb-24">
                {/* Streaming messages */}
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`max-w-[85%] rounded-lg border p-4 ${
                            m.role === "user"
                                ? "ml-auto border-transparent bg-accent-soft text-right"
                                : "mr-auto border-border bg-surface text-left"
                        }`}
                    >
                        <span
                            className={`mb-1 block text-sm font-medium ${
                                m.role === "user"
                                    ? "text-accent-ink"
                                    : "text-ink-muted"
                            }`}
                        >
                            {m.role === "user" ? "You" : "Wally"}
                        </span>
                        <div className="whitespace-pre-wrap text-ink">
                            {m.parts?.map(
                                (part, i) =>
                                    part.type === "text" && (
                                        <span key={`${m.id}-${i}`}>
                                            {part.text}
                                        </span>
                                    ),
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input form at the bottom */}
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!input.trim()) return;

                    try {
                        await sendMessage({ text: input });
                        setInput("");
                    } catch (error) {
                        console.error("Failed to send message:", error);
                    }
                }}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md border-t border-border bg-surface p-4"
            >
                <input
                    className="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-ink placeholder:text-ink-subtle focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                    value={input}
                    placeholder="Ask Wally about your recovery…"
                    onChange={(e) => setInput(e.target.value)}
                />
                <button
                    type="submit"
                    className="mt-3 h-11 w-full rounded-md bg-accent font-medium text-ink-inverse transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
