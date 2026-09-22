"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import UdhBotAvatar, { type ExpresionBot } from "@/components/UdhBotAvatar";
import { CHIPS_INICIALES, responderPregunta, type PerfilBot, type RespuestaBot } from "@/lib/udhBotKnowledge";

interface Mensaje {
  autor: "bot" | "usuario";
  texto: string;
  enlace?: { href: string; texto: string };
}

const SALUDO: Mensaje = {
  autor: "bot",
  texto:
    "¡Hola! Soy UDH Bot, tu asistente de la Plataforma UDH. Puedo guiarte para usar el sistema o darte datos rápidos " +
    "de lo que tenemos registrado. ¿En qué te ayudo?",
};

export default function UdhBotWidget({ perfil }: { perfil: PerfilBot }) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const [input, setInput] = useState("");
  const [expresion, setExpresion] = useState<ExpresionBot>("neutral");
  const [cargando, setCargando] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  function desplazarAbajo() {
    requestAnimationFrame(() => {
      listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  function marcarExpresionTemporal(nueva: ExpresionBot) {
    setExpresion(nueva);
    setTimeout(() => setExpresion("neutral"), 4000);
  }

  async function enviar(preguntaTexto: string) {
    const pregunta = preguntaTexto.trim();
    if (!pregunta || cargando) return;

    setMensajes((m) => [...m, { autor: "usuario", texto: pregunta }]);
    setInput("");
    setCargando(true);
    setExpresion("pensando");
    desplazarAbajo();

    try {
      const resultado = await responderPregunta(pregunta, supabase, perfil);

      let respuestaBot: Mensaje;
      if (resultado.tipo === "sin_match" || !resultado.respuesta) {
        respuestaBot = {
          autor: "bot",
          texto:
            "No encontré una respuesta exacta para eso todavía. Prueba con una de estas preguntas, o reformula tu duda:",
        };
        marcarExpresionTemporal("confundido");
      } else {
        respuestaBot = { autor: "bot", texto: resultado.respuesta.texto, enlace: resultado.respuesta.enlace };
        marcarExpresionTemporal("feliz");
      }
      setMensajes((m) => [...m, respuestaBot]);
    } finally {
      setCargando(false);
      desplazarAbajo();
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {abierto && (
        <div className="mb-3 w-[340px] max-w-[calc(100vw-2.5rem)] card overflow-hidden shadow-xl flex flex-col" style={{ maxHeight: "70vh" }}>
          <div className="bg-udh-700 px-4 py-3 flex items-center gap-3 shrink-0">
            <UdhBotAvatar expresion={expresion} size={40} />
            <div className="min-w-0">
              <div className="text-white font-semibold text-sm leading-tight">UDH Bot</div>
              <div className="text-udh-100 text-xs leading-tight truncate">Asistente de la Plataforma UDH</div>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="ml-auto text-white/80 hover:text-white text-lg leading-none px-1"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div ref={listaRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-neutral-50">
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.autor === "usuario" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.autor === "usuario" ? "bg-udh-600 text-white" : "bg-white border border-neutral-200 text-neutral-700"
                  }`}
                >
                  <div className="whitespace-pre-line">{m.texto}</div>
                  {m.enlace && (
                    <Link
                      href={m.enlace.href}
                      className={`inline-block mt-1.5 text-xs font-medium hover:underline ${
                        m.autor === "usuario" ? "text-white" : "text-udh-600"
                      }`}
                    >
                      {m.enlace.texto} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="flex justify-start">
                <div className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm text-neutral-400">
                  Pensando…
                </div>
              </div>
            )}
          </div>

          <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 border-t border-neutral-100 shrink-0">
            {CHIPS_INICIALES.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => enviar(chip)}
                disabled={cargando}
                className="text-xs px-2.5 py-1 rounded-full border border-udh-200 text-udh-700 bg-udh-50 hover:bg-udh-100 disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            className="p-3 pt-2 flex gap-2 shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(input);
            }}
          >
            <input
              className="input flex-1"
              placeholder="Escribe tu pregunta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={cargando}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={cargando || !input.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-16 h-16 rounded-full bg-udh-700 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={abierto ? "Cerrar UDH Bot" : "Abrir UDH Bot"}
      >
        <UdhBotAvatar expresion={abierto ? expresion : "feliz"} size={44} />
      </button>
    </div>
  );
}
