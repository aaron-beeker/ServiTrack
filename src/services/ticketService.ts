import { collection, addDoc, doc, updateDoc, getDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EstadoTicket, Ticket, TipoServicio } from '@/types';

const VALID_TRANSITIONS: Record<EstadoTicket, EstadoTicket[]> = {
  'RECEPCIONADO': ['EN_DIAGNOSTICO'],
  'EN_DIAGNOSTICO': ['DIAGNOSTICADO'],
  'DIAGNOSTICADO': ['PENDIENTE_APROBACION'],
  'PENDIENTE_APROBACION': ['CERRADO_NO_AUTORIZADO', 'EN_REPARACION'],
  'CERRADO_NO_AUTORIZADO': [], // Estado final
  'EN_REPARACION': ['CONTROL_CALIDAD'],
  'CONTROL_CALIDAD': ['EN_REPARACION', 'REPARADO'],
  'REPARADO': ['ENTREGADO'],
  'ENTREGADO': [] // Estado final
};

export const createTicket = async (ticketData: Omit<Ticket, 'id'>) => {
  const ticketsRef = collection(db, 'tickets');
  const docRef = await addDoc(ticketsRef, ticketData);
  return docRef.id;
};

// Nueva función de negocio: Crear ticket con detección automática de garantía
export const crearTicketConDeteccionRetorno = async (
  ticketData: Omit<Ticket, 'id' | 'tipoServicio' | 'ticketOrigenId' | 'estado'>,
  forzarGarantiaManual: boolean = false
): Promise<string> => {
  const ticketsRef = collection(db, 'tickets');
  
  // Buscar último ticket entregado para este equipo
  const q = query(
    ticketsRef, 
    where('numeroSerie', '==', ticketData.numeroSerie),
    where('estado', '==', 'ENTREGADO')
  );
  const snapshot = await getDocs(q);
  
  let tipoServicio: TipoServicio = 'NUEVO_SERVICIO';
  let ticketOrigenId: string | null = null;

  if (!snapshot.empty) {
    // Ordenar en memoria porque Firestore require índice compuesto para where + orderBy
    const ticketsEntregados = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
    ticketsEntregados.sort((a, b) => {
      const dateA = a.reparacion?.fechaSalida instanceof Date ? a.reparacion.fechaSalida : (a.reparacion?.fechaSalida as any)?.toDate?.() || new Date(0);
      const dateB = b.reparacion?.fechaSalida instanceof Date ? b.reparacion.fechaSalida : (b.reparacion?.fechaSalida as any)?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    const ultimoEntregado = ticketsEntregados[0];
    
    if (ultimoEntregado.reparacion?.fechaSalida) {
      const fechaSalida = ultimoEntregado.reparacion.fechaSalida instanceof Date 
        ? ultimoEntregado.reparacion.fechaSalida 
        : (ultimoEntregado.reparacion.fechaSalida as any).toDate();
        
      const horasTranscurridas = (new Date().getTime() - fechaSalida.getTime()) / (1000 * 60 * 60);
      
      // Regla de Negocio: 72h o marcado manualmente
      if (horasTranscurridas <= 72 || forzarGarantiaManual) {
        tipoServicio = 'GARANTIA';
        ticketOrigenId = ultimoEntregado.codigoDT;
      }
    }
  }

  const finalTicketData: Omit<Ticket, 'id'> = {
    ...ticketData,
    tipoServicio,
    ticketOrigenId,
    estado: 'RECEPCIONADO'
  };

  return createTicket(finalTicketData);
};

export const getTicketById = async (id: string): Promise<Ticket | null> => {
  const docRef = doc(db, 'tickets', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Ticket;
  }
  return null;
};

export const transicionarTicket = async (id: string, nuevoEstado: EstadoTicket, updateData?: Partial<Ticket>) => {
  const ticketActual = await getTicketById(id);
  
  if (!ticketActual) {
    throw new Error("Ticket no encontrado");
  }

  const posiblesDestinos = VALID_TRANSITIONS[ticketActual.estado];
  
  if (!posiblesDestinos.includes(nuevoEstado)) {
    throw new Error(`Transición de estado inválida: no se puede pasar de ${ticketActual.estado} a ${nuevoEstado}`);
  }

  const docRef = doc(db, 'tickets', id);
  await updateDoc(docRef, { ...updateData, estado: nuevoEstado });
};

// Mantenemos updateTicket normal para updates que NO cambian estado (ej. actualizar datos de contacto)
export const updateTicket = async (id: string, updateData: Partial<Ticket>) => {
  if (updateData.estado) {
    throw new Error("Use transicionarTicket para cambiar el estado de un ticket");
  }
  const docRef = doc(db, 'tickets', id);
  await updateDoc(docRef, updateData);
};

export const getRecentTickets = async (max: number = 10): Promise<Ticket[]> => {
  const ticketsRef = collection(db, 'tickets');
  const q = query(ticketsRef, orderBy('createdAt', 'desc'), limit(max));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
};
