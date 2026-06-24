"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

interface CustomProgressProps
    extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
    indicatorColor?: string;
}

const Progress = React.forwardRef<
    React.ComponentRef<typeof ProgressPrimitive.Root>,
    CustomProgressProps // Use the new interface
>(
    (
        { className, value, indicatorColor, ...props },
        ref, // Destructure indicatorColor
    ) => (
        <ProgressPrimitive.Root
            ref={ref}
            className={cn(
                "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
                className,
            )}
            {...props}
        >
            <ProgressPrimitive.Indicator
                className="h-full w-full flex-1 transition-all"
                style={{
                    transform: `translateX(-${100 - (value || 0)}%)`,
                    backgroundColor: indicatorColor || "var(--primary)", // Use the custom color or default
                }}
            />
        </ProgressPrimitive.Root>
    ),
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
