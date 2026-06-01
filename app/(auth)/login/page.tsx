"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Falha ao realizar login");
      } else {
        setError("Erro desconhecido ao realizar login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 mb-4">
            <Image
              src="/villa-amor-logo.png"
              alt="Villa Amor Logo"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl text-gold-400">Villa Amor</h1>
          <p className="text-dark-700 font-medium">Gestão Assistencial</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-dark-800 ml-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-[58px] px-4 rounded-xl border border-cream-200 bg-white text-dark-800 focus:outline-none focus:ring-2 focus:ring-gold-400 transition-smooth"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-dark-800 ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-[58px] px-4 rounded-xl border border-cream-200 bg-white text-dark-800 focus:outline-none focus:ring-2 focus:ring-gold-400 transition-smooth"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full h-[58px] bg-gold-400 text-white rounded-xl font-bold text-lg shadow-lg transition-smooth active:scale-95",
              isLoading && "opacity-70 cursor-not-allowed"
            )}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-dark-700/50 text-xs">
          © 2026 Villa Amor Marília. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}
