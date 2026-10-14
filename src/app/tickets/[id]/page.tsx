"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCasoByCodigo } from "@/services/casoService"

export default function TicketDetalleRedirect() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || "")

  useEffect(() => {
    if (!id) {
      router.replace("/")
      return
    }

    if (id.startsWith("CASO-")) {
      router.replace(`/casos/${id}`)
      return
    }

    // Buscar si corresponde a un Caso con ese código DT u OS
    getCasoByCodigo(id)
      .then((caso) => {
        if (caso) {
          router.replace(`/casos/${caso.codigoCaso}`)
        } else {
          router.replace("/")
        }
      })
      .catch(() => {
        router.replace("/")
      })
  }, [id, router])

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500 gap-2 font-sans">
      <div className="w-6 h-6 border-2 border-[#2369A1] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-medium text-slate-600">Redirigiendo al expediente técnico oficial...</p>
    </div>
  )
}
