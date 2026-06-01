import { Navbar } from "@/components/mobile/navbar";
import { UserAvatar } from "@/components/mobile/user-avatar";
import { NetworkStatus } from "@/components/mobile/network-status";
import { InstallBanner } from "@/components/mobile/install-banner";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-cream-50">
      <header className="h-16 bg-white border-b border-cream-200 flex items-center justify-between px-6 sticky top-0 z-40">
        <h1 className="text-xl text-gold-400">Villa Amor</h1>
        <UserAvatar />
      </header>
      
      <NetworkStatus />
      <InstallBanner />

      <main className="flex-1 pb-24">
        {children}
      </main>

      <Navbar />
    </div>
  );
}
