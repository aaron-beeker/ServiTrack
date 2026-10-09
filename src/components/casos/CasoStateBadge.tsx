"use client"

import { EstadoCaso } from "@/types"

interface CasoStateBadgeProps {
  estado: EstadoCaso | string
  size?: "sm" | "md"
}

export function CasoStateBadge({ estado, size = "md" }: CasoStateBadgeProps) {
  const config: Record<string, { label: string; className: string; dot: string }> = {
    ABIERTO: {
      label: "ABIERTO",
      className: "bg-blue-50 text-[#2369A1] border-blue-200",
      dot: "bg-[#2369A1]"
    },
    EN_DIAGNOSTICO: {
      label: "EN DIAGNÓSTICO",
      className: "bg-amber-50 text-amber-800 border-amber-300",
      dot: "bg-amber-500"
    },
    PENDIENTE_DE_APROBACION: {
      label: "PEND. APROBACIÓN",
      className: "bg-sky-50 text-sky-800 border-sky-300",
      dot: "bg-sky-500"
    },
    EN_REPARACION: {
      label: "EN REPARACIÓN",
      className: "bg-violet-50 text-violet-800 border-violet-300",
      dot: "bg-violet-500"
    },
    EN_PRUEBAS: {
      label: "EN PRUEBAS (QA)",
      className: "bg-purple-50 text-purple-800 border-purple-300",
      dot: "bg-purple-500"
    },
    ENTREGADO: {
      label: "ENTREGADO",
      className: "bg-slate-100 text-slate-700 border-slate-300",
      dot: "bg-slate-400"
    },
    EN_GARANTIA: {
      label: "EN GARANTÍA",
      className: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
      dot: "bg-emerald-500 animate-pulse"
    },
    CERRADO: {
      label: "CERRADO",
      className: "bg-slate-100 text-slate-600 border-slate-300",
      dot: "bg-slate-400"
    },
    CERRADO_SIN_REPARACION: {
      label: "DEVUELTO SIN REP.",
      className: "bg-rose-50 text-rose-700 border-rose-300",
      dot: "bg-rose-500"
    }
  }

  const current = config[estado] || {
    label: estado.replace(/_/g, " "),
    className: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400"
  }

  const textClass = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-0.5"

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${textClass} ${current.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} />
      {current.label}
    </span>
  )
}
