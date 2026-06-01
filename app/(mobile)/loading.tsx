export default function MobileLoading() {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-10 text-center">
      <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="font-serif text-dark-800">Carregando...</p>
    </div>
  )
}
