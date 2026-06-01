"use client"

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cream-50 px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gold-100 flex items-center justify-center mb-6">
        <span className="text-4xl">📵</span>
      </div>
      <h1 className="text-2xl font-serif text-dark-800 mb-2">Sem conexão</h1>
      <p className="text-sm text-dark-700/60 max-w-xs leading-relaxed mb-8">
        Esta página não está disponível offline. Verifique sua conexão e tente novamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="h-12 px-8 bg-gold-400 text-white rounded-2xl font-bold text-sm active:scale-[0.97] transition-all"
      >
        Tentar novamente
      </button>
    </div>
  )
}
