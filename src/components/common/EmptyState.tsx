import type { FC, ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => {
  return (
    <div className="bg-crypto-surface/60 border border-dashed border-crypto-border rounded-xl p-8 sm:p-12 text-center max-w-md mx-auto my-8">
      {icon ? (
        <div className="mb-4 inline-flex items-center justify-center text-crypto-text-muted">
          {icon}
        </div>
      ) : (
        <div className="w-12 h-12 rounded-xl bg-crypto-surface-raised border border-crypto-border flex items-center justify-center mx-auto mb-4 text-crypto-text-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      )}

      <h4 className="text-base font-semibold text-crypto-text mb-1">
        {title}
      </h4>
      <p className="text-sm text-crypto-text-secondary mb-6">{description}</p>

      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};
