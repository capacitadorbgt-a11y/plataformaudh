// Mapeo de cuentas de correo a nombres de persona, para autocompletar
// Analista y Capacitador según quién inició sesión, en vez de escribirlo
// cada vez a mano.
const ANALISTA_POR_EMAIL: Record<string, string> = {
  "asistente.th@bogati.ec": "Monserrath",
  "asistente.th1@bogati.ec": "Doménica",
};

const CAPACITADOR_POR_EMAIL: Record<string, string> = {
  "capacitadorbgt@gmail.com": "Israel",
  "capacitadorbgt3@gmail.com": "Cristian",
};

export function analistaPorEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return ANALISTA_POR_EMAIL[email.toLowerCase()] ?? null;
}

export function capacitadorPorEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return CAPACITADOR_POR_EMAIL[email.toLowerCase()] ?? null;
}
