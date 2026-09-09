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

export type TipoServicio = 'Primer Ingreso' | 'Garantía Técnica' | 'Nueva Incidencia';
export type EstadoTicket = 'Pendiente' | 'En diagnóstico' | 'Diagnosticado' | 'En reparación' | 'Reparado' | 'Entregado' | 'Inoperativo';

export interface Ticket {
  id?: string;
  codigoDT: string; // Correlativo 'DT-XXXXXX'
  numeroSerie: string; // FK a Equipo
  clienteId: string; // FK a Cliente
  responsable: string;
  tipoServicio: TipoServicio;
  ticketOrigenId: string | null;
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
  
  reparacion?: {
    fechaInicio: Date;
    actividadRealizada: string;
    repuestosInstalados: string[];
    observacionesFinales: string;
    fechaSalida: Date | null;
    lugarEntrega: string;
  };
  
  createdAt: Date;
}
