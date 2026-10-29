import { LiveSync } from "@/components/live/LiveSync";
import { Header } from "@/components/layout/Header";

// La protección real está en cada página (verifySession): los layouts no se
// vuelven a renderizar en navegación cliente, así que no son un buen lugar para auth.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <LiveSync />
      <Header />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] md:pt-8">
        {children}
      </div>
    </>
  );
}
