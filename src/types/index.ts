export interface Cliente {
  id?: string; // Document ID en Firestore
  clienteId: string; // RUC/DNI
  razonSocial: string;
  nombreContacto: string;
  telefono: string;
  correo: string;
  createdAt: Date;
}

export interface Equipo {
  id?: string;
  numeroSerie: string; // Único
  tipo: string;
  marca: string;
  modelo: string;
  partNumber: string;
  clienteId: string; // FK a Cliente
  historialTickets: string[]; // Arreglo de IDs de tickets
}

export type TipoServicio = 'GARANTIA' | 'NUEVO_SERVICIO';
export type EstadoTicket = 
  | 'RECEPCIONADO' 
  | 'EN_DIAGNOSTICO' 
  | 'DIAGNOSTICADO' 
  | 'PENDIENTE_APROBACION' 
  | 'CERRADO_NO_AUTORIZADO' 
  | 'EN_REPARACION' 
  | 'CONTROL_CALIDAD' 
  | 'REPARADO' 
  | 'ENTREGADO';

export interface Ticket {
  id?: string;
  codigoDT: string; // Correlativo 'DT-XXXXXX'
  numeroSerie: string; // FK a Equipo
  clienteId: string; // FK a Cliente
  responsable: string;
  tipoServicio: TipoServicio;
  ticketOrigenId: string | null; // ID del ticket anterior si es GARANTIA
  estado: EstadoTicket;
  
  ingreso: {
    fecha: Date;
    fallaReportada: string;
    danoFisico: string;
    accesorios: string[];
  };
  
  diagnostico?: {
    fecha: Date;
    diagnosticoTecnico: string;
    fallaReal: string;
    accionRecomendada: string;
    repuestos: string[];
  };

  aprobacion?: {
    fechaRespuesta: Date;
    aprobado: boolean;
    observaciones: string;
  };
  
  reparacion?: {
    fechaInicio: Date;
    actividadRealizada: string;
    repuestosInstalados: string[];
    observacionesFinales: string;
    fechaSalida: Date | null;
    lugarEntrega: string;
  };
  
  qa?: {
    fecha: Date;
    aprobado: boolean;
    observaciones: string;
  };
  
  createdAt: Date;
}

export interface ModeloEquipo {
  id?: string;
  nombre: string;
  marca: string;
  tipo: string;
}
