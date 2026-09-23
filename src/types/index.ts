export type EstadoGeneral = 
  | 'REGISTRADO' 
  | 'EN_DIAGNOSTICO' 
  | 'DIAGNOSTICADO' 
  | 'DIAGNOSTICADO_NO_APROBADO'
  | 'CERRADO_SIN_REPARACION'
  | 'APROBADO_PARA_REPARACION'
  | 'EN_REPARACION' 
  | 'REPARADO' 
  | 'INOPERATIVO' 
  | 'OBSERVADO' 
  | 'ENTREGADO';

export type TipoFalla = 'HARDWARE' | 'SOFTWARE' | 'OPERATIVO';

export interface ClienteOrden {
  razonSocial: string;
  ruc: string; // 11 dígitos
  contacto: string;
  telefono?: string;
  correo?: string;
}

export interface EquipoOrden {
  tipoEquipo: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  partNumber?: string;
}

export interface RepuestoItem {
  partNumber: string;
  descripcion: string;
  cantidad: number;
}

export interface IngresoOrden {
  fechaIngreso: string;
  registradoPor: string;
  cliente: ClienteOrden;
  equipo: EquipoOrden;
  fallaReportada: string;
}

export interface DiagnosticoOrden {
  fechaDiagnostico: string | null;
  tecnicoDiagnostico: string | null;
  tipoFalla: TipoFalla | null;
  diagnosticoDetallado: string | null;
  danosFisicos: string | null;
  requiereRepuestos: boolean;
  solucionPropuesta?: string | null;
  repuestosRequeridos: RepuestoItem[];
}

export interface AprobacionCliente {
  fechaDecision: string | null;
  aprobado: boolean; // true: Aprobado para reparación, false: Rechazado
  motivoRechazo?: string | null;
  registradoPor?: string | null;
}

export interface IntervencionOrden {
  fechaIntervencion: string | null;
  tecnicoAsignado: string | null;
  actividadesRealizadas: string | null;
  horasHombre: number;
  estadoReparacion: 'REPARADO' | 'INOPERATIVO' | 'OBSERVADO' | null;
  pruebasQA?: {
    superoPruebas: boolean;
    observacionesQA?: string;
  } | null;
  firmaDigitalTecnico?: string | null;
}

export interface CierreOrden {
  fechaEntrega: string | null;
  lugarEntrega: string | null;
  receptorNombre?: string | null;
  receptorDniRuc?: string | null;
  firmaReceptor?: string | null;
  observacionesFinales: string | null;
  constanciaGenerada: boolean;
  urlPdf: string | null;
}

export interface OrdenServicio {
  id?: string;
  codigoDT: string; // 'DT-XXXXXX' (document ID en Firestore)
  estadoGeneral: EstadoGeneral;
  creadoEl: string;
  actualizadoEl: string;
  ingreso: IngresoOrden;
  diagnostico: DiagnosticoOrden;
  aprobacion?: AprobacionCliente | null;
  intervencion: IntervencionOrden;
  cierre: CierreOrden;
}

// Catálogo maestro: repuestos
export interface RepuestoCatalogo {
  id: string; // Part Number (doc id)
  descripcion: string;
  marca: string;
  modeloCompatible: string;
  categoria: string;
  stock: number;
  activo: boolean;
}

// Catálogo maestro: usuarios
export interface UsuarioSistema {
  id: string; // e.g. "beeker.valdez"
  nombreCompleto: string;
  correo: string;
  rol: 'ADMIN' | 'TECNICO';
  cargo: string;
  activo: boolean;
}

// Aliases para retrocompatibilidad
export type Ticket = OrdenServicio;
export type EstadoTicket = EstadoGeneral;
export interface Cliente extends ClienteOrden {
  id?: string;
  clienteId: string;
  nombreContacto: string;
  createdAt?: Date;
}
export interface Equipo extends EquipoOrden {
  id?: string;
  tipo: string;
  clienteId?: string;
  historialTickets?: string[];
}
export interface ModeloEquipo {
  id?: string;
  nombre: string;
  marca: string;
  tipo: string;
}
