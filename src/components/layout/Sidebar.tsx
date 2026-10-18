import type { FC, ReactNode } from "react";
import { StatusBadge } from "../ui/Badge.tsx";

export type NavSection =
  | "overview"
  | "markets"
  | "watchlist"
  | "portfolio"
  | "alerts"
  | "ai"
  | "settings";

interface NavItem {
  id: NavSection;
  label: string;
  phaseText?: string;
  isImplemented: boolean;
  icon: (active: boolean) => ReactNode;
}

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems: NavItem[] = [
    {
      id: "overview",
      label: "Overview",
      isImplemented: true,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 ${active ? "text-crypto-accent" : "text-crypto-text-secondary"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      id: "markets",
      label: "Mercados",
      isImplemented: true,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 ${active ? "text-crypto-accent" : "text-crypto-text-secondary"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      id: "watchlist",
      label: "Watchlist",
      isImplemented: true,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 ${active ? "text-crypto-accent" : "text-crypto-text-secondary"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ),
    },
    {
      id: "portfolio",
      label: "Mi cartera",
      isImplemented: true,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 ${active ? "text-crypto-accent" : "text-crypto-text-secondary"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      id: "alerts",
      label: "Alertas",
      isImplemented: true,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 ${active ? "text-crypto-accent" : "text-crypto-text-secondary"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
    {
      id: "ai",
      label: "AI Analyst",
      phaseText: "Fase 9",
      isImplemented: false,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 ${active ? "text-crypto-accent-strong" : "text-crypto-text-secondary"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  const handleItemClick = (item: NavItem) => {
    onSelectSection(item.id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-crypto-surface border-r border-crypto-border">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-crypto-border">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crypto-primary to-crypto-accent flex items-center justify-center font-bold text-white shadow-sm shadow-crypto-primary/20">
              <span className="text-sm font-mono tracking-tighter">MC</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-crypto-text">
                  My Crypto
                </span>
                <span className="text-xs font-mono font-semibold px-1 rounded bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/20">
                  2.0
                </span>
              </div>
              <span className="text-[10px] text-crypto-text-muted font-mono tracking-widest block uppercase">
                Terminal
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-br from-crypto-primary to-crypto-accent flex items-center justify-center font-bold text-white">
            <span className="text-sm font-mono">MC</span>
          </div>
        )}

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-hover"
          aria-label="Cerrar navegación"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-2 mb-2">
          {!isCollapsed && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-crypto-text-muted font-mono">
              Plataforma
            </span>
          )}
        </div>

        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              title={isCollapsed ? `${item.label} ${item.phaseText ? `(${item.phaseText})` : ""}` : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-crypto-primary-soft text-crypto-text border-l-2 border-crypto-primary shadow-sm"
                  : "text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-hover"
              } ${!item.isImplemented && !isActive ? "opacity-75" : ""}`}
            >
              <span className="flex-shrink-0">{item.icon(isActive)}</span>
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between text-left">
                  <span>{item.label}</span>
                  {item.phaseText && (
                    <StatusBadge variant="upcoming">{item.phaseText}</StatusBadge>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Settings & Collapse Footer */}
      <div className="p-3 border-t border-crypto-border space-y-1">
        <button
          type="button"
          onClick={() => onSelectSection("settings")}
          title={isCollapsed ? "Ajustes (Fase 10)" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSection === "settings"
              ? "bg-crypto-primary-soft text-crypto-text"
              : "text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-hover"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between">
              <span>Ajustes</span>
              <StatusBadge variant="upcoming">Fase 10</StatusBadge>
            </div>
          )}
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg text-crypto-text-muted hover:text-crypto-text hover:bg-crypto-surface-hover transition-colors"
          title={isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
