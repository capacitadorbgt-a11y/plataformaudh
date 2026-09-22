import { requireUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import UdhBotWidget from "@/components/UdhBotWidget";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <UdhBotWidget perfil={{ nombre: profile.nombre, role: profile.role }} />
    </div>
  );
}
