import { useEffect, useState } from 'react';

interface FocusBankProps {
  total: number;
  earned: number;
  available: number;
  onEarn: (amount: number) => void;
  onSettle: () => void;
  loading: boolean;
}

export default function FocusBank({ total, earned, available, onEarn, onSettle, loading }: FocusBankProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [isEarning, setIsEarning] = useState(false);
  const [droppingCoins, setDroppingCoins] = useState<Array<{ id: number; delay: number }>>([]);
  const [lastEarned, setLastEarned] = useState(0);
  
  const percentage = total > 0 ? (earned / total) * 100 : 0;
  const fillPercentage = percentage; // Sphere fills up as you earn

  const stage = Math.min(4, Math.floor(percentage / 20));

  // Trigger coin drop animation on earn
  useEffect(() => {
    if (earned > lastEarned && lastEarned > 0) {
      const earnedAmount = earned - lastEarned;
      const coinCount = Math.min(Math.ceil(earnedAmount / 10), 12);
      const newCoins = Array.from({ length: coinCount }, (_, i) => ({
        id: Date.now() + i,
        delay: i * 100,
      }));
      setDroppingCoins(newCoins);
      setTimeout(() => setDroppingCoins([]), 2000);
    }
    setLastEarned(earned);
  }, [earned]);
  
  const handleEarn = (amount: number) => {
    if (loading || isEarning || amount > available) return;
    setIsEarning(true);
    onEarn(amount);
    setTimeout(() => setIsEarning(false), 500);
  };

  const handleCustomEarn = () => {
    const amount = parseFloat(customAmount);
    if (!isNaN(amount) && amount > 0 && amount <= available) {
      handleEarn(amount);
      setCustomAmount('');
    }
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-8 mb-6 relative overflow-hidden border border-white/10">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              🏦 Focus Bank
            </h2>
            <div className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-400/30 backdrop-blur-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs font-semibold text-blue-300">Visa Direct</span>
            </div>
          </div>
          <p className="text-white/60">
            {stage === 0 && "Your Focus Bank is ready. Start earning to fill it up!"}
            {stage === 1 && "Progress! Keep focusing..."}
            {stage === 2 && "Halfway there! The sphere is filling..."}
            {stage === 3 && "Almost complete! Just a bit more..."}
            {stage === 4 && "Bank full! Time to settle and start fresh."}
          </p>
          <p className="text-xs text-white/40 mt-2">Powered by Visa Developer Sandbox • PAAI + Funds Transfer API</p>
        </div>
        
        <div className="flex flex-col items-center gap-8">
          {/* Glass Sphere Visual */}
          <div className="relative w-80 h-80">
            {/* Coin slot on top */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20">
              <div className="relative">
                {/* Slot opening */}
                <div className="w-24 h-8 rounded-t-xl bg-gradient-to-b from-slate-700/80 to-slate-800/80 backdrop-blur-sm border-2 border-slate-600/50 shadow-xl">
                  <div className="absolute inset-x-4 top-2 h-3 bg-black/50 rounded-sm" />
                </div>
                {/* Slot label */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white/60 font-medium whitespace-nowrap">
                  DROP COINS HERE
                </div>
              </div>
            </div>

            {/* Dropping coins animation */}
            {droppingCoins.map((coin) => (
              <div
                key={coin.id}
                className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                style={{
                  top: '-60px',
                  animation: 'dropCoin 1.5s ease-in forwards',
                  animationDelay: `${coin.delay}ms`,
                }}
              >
                <div className="relative w-10 h-10">
                  {/* Coin front */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-lg border-2 border-yellow-200 flex items-center justify-center">
                    <span className="text-amber-900 font-bold text-lg">$</span>
                  </div>
                  {/* Coin shine */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/60 via-transparent to-transparent" />
                </div>
              </div>
            ))}

            {/* Outer glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />

            {/* Main glass sphere container */}
            <div className="relative w-full h-full rounded-full overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-2xl">
              {/* Liquid fill with gradient */}
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
                style={{
                  height: `${fillPercentage}%`,
                  background: `linear-gradient(180deg, 
                    rgba(59, 130, 246, 0.8) 0%, 
                    rgba(147, 51, 234, 0.8) 50%,
                    rgba(168, 85, 247, 0.9) 100%)`,
                }}
              >
                {/* Liquid surface shimmer */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />

                {/* Liquid wave animation */}
                <div
                  className="absolute top-0 left-0 right-0 h-4 opacity-50"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%)',
                    animation: 'wave 3s ease-in-out infinite',
                  }}
                />
              </div>

              {/* Glass reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />

              {/* Fracture lines based on stage */}
              {stage > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 320">
                  {stage >= 1 && (
                    <>
                      <line
                        x1="160"
                        y1="0"
                        x2="160"
                        y2="320"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1"
                        className="animate-pulse"
                      />
                      <line
                        x1="0"
                        y1="160"
                        x2="320"
                        y2="160"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1"
                        className="animate-pulse"
                      />
                    </>
                  )}
                  {stage >= 2 && (
                    <>
                      <line
                        x1="80"
                        y1="0"
                        x2="240"
                        y2="320"
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth="1"
                        className="animate-pulse"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <line
                        x1="240"
                        y1="0"
                        x2="80"
                        y2="320"
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth="1"
                        className="animate-pulse"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </>
                  )}
                  {stage >= 3 && (
                    <>
                      <circle
                        cx="160"
                        cy="160"
                        r="100"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="1"
                        fill="none"
                        className="animate-pulse"
                        style={{ animationDelay: '0.4s' }}
                      />
                      <circle
                        cx="160"
                        cy="160"
                        r="60"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="1"
                        fill="none"
                        className="animate-pulse"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </>
                  )}
                  {stage >= 4 && (
                    <>
                      <line
                        x1="120"
                        y1="40"
                        x2="200"
                        y2="280"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                        className="animate-pulse"
                        style={{ animationDelay: '0.6s' }}
                      />
                      <line
                        x1="200"
                        y1="40"
                        x2="120"
                        y2="280"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                        className="animate-pulse"
                        style={{ animationDelay: '0.6s' }}
                      />
                      <line
                        x1="40"
                        y1="120"
                        x2="280"
                        y2="200"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                        className="animate-pulse"
                        style={{ animationDelay: '0.6s' }}
                      />
                      <line
                        x1="280"
                        y1="120"
                        x2="40"
                        y2="200"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                        className="animate-pulse"
                        style={{ animationDelay: '0.6s' }}
                      />
                    </>
                  )}
                </svg>
              )}

              {/* Center percentage display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-white drop-shadow-lg">{percentage.toFixed(0)}%</div>
                  <div className="text-sm text-white/80 mt-2 font-medium">{percentage >= 100 ? 'Complete' : 'Earned'}</div>
                </div>
              </div>
            </div>

            {/* Bottom shadow */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-64 h-8 bg-black/20 rounded-full blur-xl" />
          </div>

          {/* Stats section */}
          <div className="grid grid-cols-3 gap-6 w-full max-w-md">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/10">
              <div className="text-sm text-white/60 mb-1">Earned</div>
              <div className="text-2xl font-bold text-blue-400">${earned.toFixed(2)}</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/10">
              <div className="text-sm text-white/60 mb-1">Available</div>
              <div className="text-2xl font-bold text-purple-400">${available.toFixed(2)}</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-blue-500/10 backdrop-blur-sm border border-white/10">
              <div className="text-sm text-white/60 mb-1">Total</div>
              <div className="text-2xl font-bold text-pink-400">${total.toFixed(2)}</div>
            </div>
          </div>

          {/* Stage indicator dots */}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                  s <= stage ? 'bg-gradient-to-r from-blue-500 to-purple-500 scale-125 shadow-lg' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Controls section */}
          {available > 0 ? (
            <div className="flex flex-col gap-4 w-full max-w-md">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomEarn()}
                  disabled={loading || isEarning}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleCustomEarn}
                  disabled={loading || isEarning || !customAmount}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  Earn
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleEarn(amount)}
                    disabled={loading || isEarning || amount > available}
                    className="px-3 py-2 bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 text-white rounded-lg text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    +${amount}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full max-w-md">
              <div className="p-4 bg-purple-500/10 border-2 border-purple-500/30 rounded-lg backdrop-blur-sm">
                <p className="text-purple-300 font-semibold mb-2">🎉 Bank Fully Earned!</p>
                <p className="text-sm text-white/70">
                  You've earned back ${earned.toFixed(2)} of ${total.toFixed(2)}. Time to settle and close this stake!
                </p>
              </div>
              <button
                onClick={onSettle}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-bold disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                {loading ? 'Settling...' : '🌕 Settle & Start Fresh'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes wave {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        
        @keyframes dropCoin {
          0% {
            transform: translateX(-50%) translateY(0) rotateY(0deg);
            opacity: 1;
          }
          70% {
            transform: translateX(-50%) translateY(200px) rotateY(720deg);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(220px) rotateY(1080deg) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
