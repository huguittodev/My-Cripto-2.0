import { useState } from "react";
import type { FC, ReactNode, FormEvent } from "react";
import { Sidebar } from "./Sidebar.tsx";
import type { NavSection } from "./Sidebar.tsx";
import { Topbar } from "./Topbar.tsx";

interface AppLayoutProps {
  children: ReactNode;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  sectionTitle: string;
  sectionSubtitle: string;
  numCryptos: string;
  onChangeNumCryptos: (val: string) => void;
  onSubmitNumCryptos: (e: FormEvent) => void;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated: string | null;
  hasError: boolean;
}

export const AppLayout: FC<AppLayoutProps> = ({
  children,
  activeSection,
  onSelectSection,
  sectionTitle,
  sectionSubtitle,
  numCryptos,
  onChangeNumCryptos,
  onSubmitNumCryptos,
  onRefresh,
  isLoading,
  lastUpdated,
  hasError,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-crypto-bg text-crypto-text flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <Topbar
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          sectionTitle={sectionTitle}
          sectionSubtitle={sectionSubtitle}
          numCryptos={numCryptos}
          onChangeNumCryptos={onChangeNumCryptos}
          onSubmitNumCryptos={onSubmitNumCryptos}
          onRefresh={onRefresh}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
          hasError={hasError}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </main>

        <footer className="py-6 px-4 sm:px-8 border-t border-crypto-border text-center text-xs text-crypto-text-muted">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="My Crypto 2.0" className="w-4 h-4 object-contain opacity-80" />
              <span className="font-semibold text-crypto-text-secondary">My Crypto 2.0</span>
              <span>—</span>
              <span>Terminal de investigación y seguimiento financiero</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Fuente: CoinGecko API v3</span>
              <span>Modo no custodial</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
