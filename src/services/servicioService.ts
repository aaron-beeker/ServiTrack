import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ServicioContrato } from '@/types';

const COLECCION_SERVICIOS = 'servicios_cliente';

/** Catálogo de servicios contratados (licitaciones / contratos / OS del cliente). */
export const getAllServiciosCliente = async (): Promise<ServicioContrato[]> => {
  try {
    const snap = await getDocs(collection(db, COLECCION_SERVICIOS));
    return snap.docs
      .map((d) => ({ ...(d.data() as ServicioContrato), id: d.id }))
      .sort((a, b) => {
        if (a.estado !== b.estado) return a.estado === 'ACTIVO' ? -1 : 1;
        return (b.fechaInicio || '').localeCompare(a.fechaInicio || '');
      });
  } catch (err) {
    console.warn('No se pudo consultar servicios del cliente:', err);
    return [];
  }
};

/** Etiqueta estándar: "Contrato 005-2026 · OS Cliente 224" o "OS Cliente 4483". */
export const etiquetaReferenciaServicio = (s: {
  tipoContratacion?: string;
  numeroContrato?: string | null;
  ordenServicioCliente?: string | null;
}): string => {
  const partes: string[] = [];
  if (s.numeroContrato) {
    partes.push(`${s.tipoContratacion === 'RESOLUCION' ? 'Resolución' : 'Contrato'} ${s.numeroContrato}`);
  }
  if (s.ordenServicioCliente) partes.push(`OS Cliente ${s.ordenServicioCliente}`);
  return partes.join(' · ');
};

export const diasRestantesServicio = (fechaFin?: string): number | null => {
  if (!fechaFin) return null;
  const fin = new Date(`${fechaFin}T23:59:59`);
  return Math.max(0, Math.ceil((fin.getTime() - Date.now()) / 86400000));
};

