"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumb({
  items,
  showHome = true,
  className = "",
}: BreadcrumbProps) {
  return (
    <nav
      className={`flex items-center gap-1.5 text-sm mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <Link
            href="/"
            className="text-text-tertiary hover:text-text-primary transition-colors flex items-center"
          >
            <Home className="w-4 h-4" />
          </Link>
          {items.length > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
          )}
        </>
      )}
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {index > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-text-primary font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
