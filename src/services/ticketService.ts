import { 
  getOrdenServicioByCodigo, 
  getOrdenesServicio, 
  crearOrdenServicio,
  verificarSerieActiva,
  actualizarEstadoOrden,
  guardarDiagnosticoTecnico,
  iniciarIntervencion,
  cerrarIntervencionTecnica,
  registrarEntregaYFinalizar
} from './ordenServicioService';
import { OrdenServicio, EstadoGeneral } from '@/types';

// Exportaciones directas del nuevo servicio
export {
  getOrdenServicioByCodigo,
  getOrdenesServicio,
  crearOrdenServicio,
  verificarSerieActiva,
  actualizarEstadoOrden,
  guardarDiagnosticoTecnico,
  iniciarIntervencion,
  cerrarIntervencionTecnica,
  registrarEntregaYFinalizar
};

// Aliases para retrocompatibilidad con código existente
export const getTicketById = async (id: string): Promise<OrdenServicio | null> => {
  return getOrdenServicioByCodigo(id);
};

export const getRecentTickets = async (maxCount: number = 20): Promise<OrdenServicio[]> => {
  const ordenes = await getOrdenesServicio();
  return ordenes.slice(0, maxCount);
};

export const transicionarTicket = async (
  id: string, 
  nuevoEstado: EstadoGeneral, 
  updateData?: Partial<OrdenServicio>
): Promise<void> => {
  return actualizarEstadoOrden(id, nuevoEstado, updateData);
};

export const updateTicket = async (
  id: string, 
  updateData: Partial<OrdenServicio>
): Promise<void> => {
  const actual = await getOrdenServicioByCodigo(id);
  const estado = actual ? actual.estadoGeneral : 'REGISTRADO';
  return actualizarEstadoOrden(id, estado, updateData);
};
