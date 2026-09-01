import { signIn } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-udh-700">UDH</div>
          <div className="text-sm text-neutral-500">Universidad del Helado · Bogati</div>
        </div>

        <form action={signIn} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Correo</label>
            <input className="input" type="email" id="email" name="email" required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input className="input" type="password" id="password" name="password" required />
          </div>

          {searchParams?.error && (
            <p className="text-sm text-red-600">{searchParams.error}</p>
          )}

          <button type="submit" className="btn-primary w-full">
            Ingresar
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Acceso interno · Departamento UDH
        </p>
      </div>
    </div>
  );
}
