import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import * as Separator from "@radix-ui/react-separator";
import React from "react";

interface SidebarSectionProps {
    isExpanded: boolean;
    title: string;
    icon: React.ElementType; // Icon component passed as a prop
    defaultOpen?: boolean;
    links: { name: string; path: string }[];
    onNavigate: (path: string) => void;
}

export default function SidebarSection({
    isExpanded,
    title,
    icon: Icon,
    defaultOpen = false,
    links,
    onNavigate,
}: SidebarSectionProps) {
    // We only allow the section to be collapsible if the whole sidebar is expanded
    const isCollapsible = isExpanded;

    return (
        <Collapsible.Root
            defaultOpen={defaultOpen}
            className="w-full mb-4"
            // The disabled prop prevents the user from clicking to collapse
            // when the sidebar is collapsed (w-16)
            disabled={!isCollapsible}
        >
            {/* The Trigger for the Collapsible section */}
            <Collapsible.Trigger asChild>
                <button
                    className="flex items-center justify-between w-full p-2 text-ink-muted hover:text-ink hover:bg-surface-sunken rounded-md group focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                    aria-label={`Toggle ${title} section`}
                >
                    <div className="flex items-center">
                        <Icon className="w-6 h-6 shrink-0 group-hover:text-accent-ink" />
                        {isExpanded && (
                            <span className="ml-3 text-sm font-medium whitespace-nowrap">
                                {title}
                            </span>
                        )}
                    </div>
                    {/* Only show and rotate Chevron when expanded and collapsible */}
                    {isCollapsible && (
                        <ChevronDownIcon
                            className="w-4 h-4 transition-transform duration-300 CollapsibleChevron"
                            // Radix handles the data-state for us!
                            data-state={!isCollapsible ? "closed" : undefined}
                        />
                    )}
                </button>
            </Collapsible.Trigger>

            {/* The Separator only appears when the Sidebar is expanded */}
            {isExpanded && (
                <Separator.Root className="bg-border h-px my-2 w-full" />
            )}

            {/* The Content that Collapses */}
            <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                <div className="mt-2 space-y-1">
                    {links.map((link) => (
                        <button
                            key={link.path}
                            onClick={() => onNavigate(link.path)}
                            className="block w-full text-left pl-9 pr-2 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink rounded-md focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                        >
                            {link.name}
                        </button>
                    ))}
                </div>
            </Collapsible.Content>
        </Collapsible.Root>
    );
}
