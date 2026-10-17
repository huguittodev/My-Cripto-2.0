import { useState } from "react";
import { getTopCoins } from "./services/api";
import type { CryptoList } from "./types/crypto";
import { CoinCard } from "./components/CoinCard";

function App() {
  const [coins, setCoins] = useState<CryptoList>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cambiamos a false para que no salga el spinner antes de buscar
  const [loading, setLoading] = useState(false);

  const [value, setValue] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null); // Limpiamos errores anteriores

    // Validamos el input antes de hacer la petición
    const num = parseInt(value);
    if (isNaN(num) || num <= 0) return alert("Introduce un número válido");

    setLoading(true);
    getTopCoins({ numCryptos: num })
      .then((data) => {
        setCoins(data);
        setLoading(false);
      })
      .catch((err) => setErrorMsg(err.message)) // Capturamos el error para mostrarlo en la UI
      .finally(() => setLoading(false));
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Crypto Monitor</h1>

      <div className="flex flex-col items-center">
        <form onSubmit={handleSubmit} className="flex justify-center mb-12">
          <input
            type="number"
            placeholder="Ej: 10"
            className="focus:outline-none bg-slate-800 text-white p-3 rounded-l-lg border border-slate-600 focus:border-cyan-500 w-64"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-r-lg font-bold transition-all shadow-lg shadow-cyan-500/20"
          >
            Ver Criptos
          </button>
        </form>

        {errorMsg && (
          <span className="bg-red-500/20 text-white p-2 rounded-md mb-6 text-center w-6/12">
            {errorMsg}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {coins.map((coin) => (
            <CoinCard key={coin.id} coin={coin} />
          ))}
        </div>
      )}

      {!loading && coins.length === 0 && (
        <p className="text-center text-slate-500">
          Escribe un número para empezar a monitorizar...
        </p>
      )}
    </main>
  );
}

export default App;
