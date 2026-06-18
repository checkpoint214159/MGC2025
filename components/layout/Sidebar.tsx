"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Home, Activity, Salad, MessageCircle, LogOut, ChevronLeft, ChevronRight, User, Users } from "lucide-react";
import { useCaregiver } from "@/context/CaregiverContext";
import { FLAGS } from "@/lib/config/flags";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Home };

const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: Home },
  { href: "/recovery/exercise", label: "Exercise", icon: Activity },
  { href: "/recovery/nutrition", label: "Nutrition", icon: Salad },
  { href: "/chat", label: "Ask", icon: MessageCircle },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isCaregiver, enter, exit } = useCaregiver();

  const name = session?.user?.name?.split(" ")[0] || "Patient";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-surface border-r border-border",
        "transition-[width] duration-300 ease-[var(--ease-out-quart)]",
        collapsed ? "w-[72px]" : "w-[240px]",
        "hidden md:flex"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="size-8 rounded-lg bg-accent grid place-items-center text-ink-inverse font-semibold text-[15px]">
          R
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-ink">Recovery</div>
            <div className="text-[12px] text-ink-muted">Your daily companion</div>
          </div>
        )}
      </div>

      {/* Greeting */}
      {!collapsed && (
        <div className="mx-3 mb-4 rounded-md bg-surface-sunken px-3 py-2.5">
          <div className="text-[12px] text-ink-subtle">Signed in as</div>
          <div className="text-[14px] font-medium text-ink truncate">{name}</div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 h-11 text-[14px] font-medium",
                "transition-colors duration-150",
                active
                  ? "bg-accent-soft text-accent-ink"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={1.75} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-2 border-t border-border space-y-0.5">
        <Link
          href="/patient/info"
          className="flex items-center gap-3 rounded-md px-3 h-11 text-[14px] font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <User size={20} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && <span>Profile</span>}
        </Link>
        {FLAGS.caregiverMode && (
          <button
            type="button"
            onClick={() => (isCaregiver ? exit() : enter(name))}
            className={cn(
              "w-full flex items-center gap-3 rounded-md px-3 h-11 text-[14px] font-medium",
              isCaregiver
                ? "bg-accent-soft text-accent-ink"
                : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
            )}
            aria-pressed={isCaregiver}
          >
            <Users size={20} strokeWidth={1.75} className="shrink-0" />
            {!collapsed && <span>{isCaregiver ? "Exit caregiver view" : "Caregiver view"}</span>}
          </button>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 rounded-md px-3 h-11 text-[14px] font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <LogOut size={20} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-center gap-2 rounded-md px-3 h-9 mt-2 text-[12px] text-ink-subtle hover:text-ink hover:bg-surface-sunken"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
