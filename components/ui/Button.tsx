import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md button vocabulary: primary = accent bg + ink-inverse; secondary = border-strong
// outline; ghost = ink-muted w/ sunken hover; destructive = critical. 44px default target,
// weight 500, radius-md, 3px brand-blue focus ring.
const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-accent text-ink-inverse hover:bg-accent-hover",
                outline:
                    "border border-border-strong bg-transparent hover:bg-surface-sunken text-ink",
                ghost: "hover:bg-surface-sunken text-ink-muted",
                danger: "bg-critical text-ink-inverse hover:opacity-90",
            },
            size: {
                default: "h-11 px-4 py-2",
                sm: "h-9 px-3 text-xs",
                lg: "h-12 px-8 text-base",
                xl: "h-14 px-10 text-lg",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant,
            size,
            asChild = false,
            isLoading,
            children,
            ...props
        },
        ref,
    ) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </Comp>
        );
    },
);
Button.displayName = "Button";

export { Button, buttonVariants };
