import React from "react";

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

// DESIGN.md card: surface bg, warm hairline border, radius-lg. Borders carry the elevation —
// no default shadow (shadows only on real elevation changes like popovers/sticky bars).
export function Card({ children, className = "" }: CardProps) {
    return (
        <div
            className={`bg-surface rounded-lg border border-border overflow-hidden ${className}`}
        >
            {children}
        </div>
    );
}
