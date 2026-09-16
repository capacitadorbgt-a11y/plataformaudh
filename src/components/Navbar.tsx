import Link from "next/link";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/types/database";

export default function Navbar({ profile }: { profile: Profile }) {
  const esAdmin = profile.role === "admin_udh";
  const links = [{ href: "/", label: "Panel" }];

  if (esAdmin || profile.permisos?.escuelas !== false) {
    links.push({ href: "/escuelas", label: "Escuelas" });
  }
  if (esAdmin || profile.permisos?.seguimientos !== false) {
    links.push({ href: "/seguimientos", label: "Seguimientos" });
  }
  if (esAdmin || profile.permisos?.entregas !== false) {
    links.push({ href: "/entregas", label: "Recompensas y material" });
  }
  if (esAdmin || profile.permisos?.encuestas !== false) {
    links.push({ href: "/encuestas", label: "Encuestas" });
  }
  if (esAdmin) {
    links.push({ href: "/usuarios", label: "Usuarios" });
    links.push({ href: "/auditoria", label: "Auditoría" });
  }

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-udh-700">UDH</Link>
          <nav className="hidden sm:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium leading-tight">{profile.nombre}</div>
            <div className="text-xs text-neutral-400 leading-tight">
              {profile.role === "admin_udh" ? "Admin UDH" : "Analista"}
            </div>
          </div>
          <form action={signOut}>
            <button type="submit" className="btn-secondary text-xs">Salir</button>
          </form>
        </div>
      </div>
      <nav className="sm:hidden flex overflow-x-auto gap-1 px-4 pb-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded-lg text-xs whitespace-nowrap text-neutral-600 hover:bg-neutral-100"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
