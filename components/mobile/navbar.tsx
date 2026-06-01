"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, AlertCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: Home, href: "/home" },
  { label: "Tarefas", icon: ClipboardList, href: "/pops" },
  { label: "Alertas", icon: AlertCircle, href: "/alerts" },
  { label: "Perfil", icon: User, href: "/profile" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-cream-200 flex items-center justify-around px-2 z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-2xl transition-smooth",
              isActive ? "text-gold-400 bg-gold-50" : "text-dark-700/50"
            )}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
