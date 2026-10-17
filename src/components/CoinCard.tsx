import type { Cryptocurrency } from "../types/crypto";

// Definimos qué "props" (propiedades) recibe este componente
interface CoinCardProps {
  coin: Cryptocurrency;
}

export const CoinCard = ({ coin }: CoinCardProps) => {
  const isPositive = coin.price_change_percentage_24h > 0;

  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-cyan-500 transition-all shadow-xl group">
      <div className="flex items-center gap-4 mb-4">
        <img
          src={coin.image}
          alt={coin.name}
          className="w-10 h-10 group-hover:scale-110 transition-transform"
        />
        <div>
          <h2 className="font-bold text-lg">{coin.name}</h2>
          <span className="text-slate-400 uppercase text-sm">
            {coin.symbol}
          </span>
        </div>
      </div>

      <p className="text-2xl font-mono font-bold">
        {coin.current_price.toLocaleString()}€
      </p>

      <div
        className={`mt-2 text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}
      >
        {isPositive ? "▲" : "▼"}{" "}
        {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
      </div>
    </div>
  );
};
