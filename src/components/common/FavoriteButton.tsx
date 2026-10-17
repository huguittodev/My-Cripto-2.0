import type { FC, MouseEvent } from "react";

interface FavoriteButtonProps {
  coinId: string;
  coinName?: string;
  isFavorite: boolean;
  onToggle: (coinId: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const FavoriteButton: FC<FavoriteButtonProps> = ({
  coinId,
  coinName,
  isFavorite,
  onToggle,
  size = "md",
  className = "",
}) => {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Evita propagar el clic hacia la fila o tarjeta contenedora
    e.stopPropagation();
    onToggle(coinId);
  };

  const displayName = coinName || coinId;

  const sizeClasses = {
    sm: "p-1 rounded",
    md: "p-1.5 rounded-lg",
    lg: "p-2 rounded-xl",
  }[size];

  const iconSizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite ? `Eliminar ${displayName} de favoritos` : `Añadir ${displayName} a favoritos`}
      aria-pressed={isFavorite}
      title={isFavorite ? "En tu watchlist" : "Añadir a favoritos"}
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer ${sizeClasses} ${
        isFavorite
          ? "text-crypto-warning hover:opacity-85"
          : "text-crypto-text-muted hover:text-crypto-warning hover:bg-crypto-surface-raised"
      } ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={isFavorite ? 1.5 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconSizeClasses} transition-transform active:scale-90`}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
};
