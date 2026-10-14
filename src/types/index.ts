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
  origen?: OrigenIncidencia;
  contratoAlquiler?: string;
  esAlquiler?: boolean;
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
  origen?: OrigenIncidencia;
  contratoAlquiler?: string;
  esAlquiler?: boolean;
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

export type RolUsuario = 'ADMIN' | 'TECNICO' | 'VENTAS';

// Catálogo maestro: usuarios
export interface UsuarioSistema {
  id: string; // e.g. "beeker.valdez" o uid de Google
  nombreCompleto: string;
  correo: string;
  rol: RolUsuario;
  cargo: string;
  activo: boolean;
  fotoUrl?: string;
  creadoEl?: string;
}

// Aliases para retrocompatibilidad
export type Ticket = OrdenServicio;
export type EstadoTicket = EstadoGeneral;
export interface Cliente extends ClienteOrden {
  id?: string;
  clienteId?: string;
  nombreContacto?: string;
  direccion?: string;
  creadoEl?: string;
  createdAt?: any;
}
export interface Equipo extends EquipoOrden {
  id?: string;
  tipo?: string;
  clienteId?: string;
  historialTickets?: string[];
}
export interface ModeloEquipo {
  id?: string;
  nombre: string;
  marca: string;
  tipo: string;
  partNumberSugerido?: string;
}

// ============================================================================
// MODELO ENTIDAD PRINCIPAL: EXPEDIENTE ÚNICO (CASO) Y CICLO DE VIDA COMPLETO
// ============================================================================

export type EstadoCaso = 
  | 'ABIERTO'
  | 'EN DIAGNÓSTICO'
  | 'EN_DIAGNOSTICO'
  | 'CERRADO SIN REPARACIÓN'
  | 'CERRADO_SIN_REPARACION'
  | 'PENDIENTE DE APROBACIÓN'
  | 'PENDIENTE_DE_APROBACION'
  | 'EN REPARACIÓN'
  | 'EN_REPARACION'
  | 'EN PRUEBAS'
  | 'EN_PRUEBAS'
  | 'REPARADO'
  | 'ENTREGADO'
  | 'EN GARANTÍA'
  | 'EN_GARANTIA'
  | 'CERRADO';

export type OrigenIncidencia = 'TALLER' | 'ALQUILER' | 'RECLAMO_GARANTIA' | 'Alquiler' | 'Taller' | 'Reclamo de Garantía';
export type PrioridadIncidencia = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA' | 'Baja' | 'Media' | 'Alta' | 'Crítica';
export type CondicionGarantia = 'ORDINARIA' | 'BAJO_CONTRATO' | 'APLICA GARANTIA';
export type TipoOS = 'Correctiva' | 'Preventiva' | 'Garantía' | 'Instalación' | 'Inspección';
export type TipoOrdenServicio = 'CORRECTIVA' | 'PREVENTIVA' | 'GARANTIA' | 'INSTALACION' | 'MANTENIMIENTO' | 'INSPECCION' | TipoOS;
export type EstadoOrdenServicio = 'PENDIENTE' | 'ASIGNADA' | 'EN_EJECUCION' | 'EN_PRUEBAS' | 'FINALIZADA';
export type EstadoDiagnostico = 'BORRADOR' | 'EN_EVALUACION' | 'CONCLUIDO' | 'APROBADO' | 'RECHAZADO';

export interface DatosIngresoCaso {
  cliente: { idCliente?: string; razonSocial: string; ruc: string; contacto: string; telefono?: string; correo?: string };
  activo: { numeroSerie: string; equipo?: string; tipoEquipo?: string; marca: string; modelo: string; partNumber?: string };
  contratoAlquiler: { aplicaContrato: boolean; idContrato?: string | null };
  incidenciaInicial: {
    origen: OrigenIncidencia;
    prioridad: PrioridadIncidencia;
    averiaReportada: string;
    requiereAnalisisTecnico: boolean;
  };
  responsableApertura?: string;
}

export interface IncidenciaCaso {
  id: string; // e.g. "INC-001"
  codigoINC: string;
  fecha: string;
  reportadoPor: string;
  descripcion: string;
  prioridad: PrioridadIncidencia;
  origen: OrigenIncidencia;
  esReingresoGarantia: boolean;
  vinculoIntervencionPrevia?: string; // id de OS o DT previa
  aplicaGarantia: boolean;
  requiereAnalisisTecnico: boolean; // true: ruta 2B (DT formal), false: ruta 2A (Atención Simple)
  estado: 'REGISTRADA' | 'EN_ATENCION' | 'RESUELTA';
  creadoEl: string;
}

export interface DiagnosticoTecnicoCaso {
  id: string; // e.g. "DT-001"
  codigoDT: string;
  incidenciaId?: string;
  fecha: string;
  tecnicoResponsable: string;
  tipoFalla: 'HARDWARE' | 'SOFTWARE' | 'OPERATIVO';
  hallazgos: string; // Causa raíz
  diagnosticoDetallado: string;
  danosFisicos?: string;
  requiereRepuestos: boolean;
  repuestosRequeridos: RepuestoItem[];
  recomendaciones?: string;
  solucionPropuesta?: string;
  estado: EstadoDiagnostico;
  aprobacionCliente?: {
    fechaDecision: string | null;
    aprobado: boolean;
    motivoRechazo?: string | null;
    registradoPor?: string | null;
  } | null;
  informePdfUrl?: string | null;
  creadoEl: string;
}

export interface OrdenServicioTrabajo {
  id: string; // e.g. "OS-001"
  codigoOS: string;
  incidenciaId?: string;
  diagnosticoId?: string;
  tipo: TipoOrdenServicio;
  tecnicoAsignado: string;
  actividades: string;
  horasHombre: number;
  estado: EstadoOrdenServicio;
  fechaInicio?: string;
  fechaFin?: string;
  pruebasQA?: {
    superoQA: boolean;
    observacionesQA?: string;
    fechaPruebas?: string;
    tecnicoQA?: string;
  } | null;
  firmaDigitalTecnico?: string | null;
  creadoEl: string;
}

export interface ConstanciaAtencionSimple {
  id: string; // e.g. "CONST-001"
  codigoConstancia: string;
  incidenciaId?: string;
  fecha: string;
  tecnicoResponsable: string;
  motivoSoporte: string; // Proveniente de la falla reportada de la incidencia inicial
  actividadesRealizadas: string;
  resultado: string;
  ticketItop?: string | null; // Ticket de iTop al cual se dio asistencia
  firmaReceptor?: string | null;
  creadoEl: string;
}

export interface GarantiaCaso {
  aplicaGarantia: boolean;
  diasGarantia: number;
  fechaInicioGarantia?: string;
  fechaVencimientoGarantia?: string;
  activa: boolean;
  reingresosContador: number;
}

export interface ActividadHistorial {
  id: string;
  fecha: string;
  autor: string;
  tipo: 
    | 'APERTURA' 
    | 'INCIDENCIA' 
    | 'DIAGNOSTICO' 
    | 'APROBACION' 
    | 'RECHAZO' 
    | 'ORDEN_SERVICIO' 
    | 'ATENCION_SIMPLE' 
    | 'ENTREGA' 
    | 'GARANTIA_ACTIVADA' 
    | 'REINGRESO_GARANTIA' 
    | 'CIERRE';
  titulo: string;
  detalle: string;
  referenciaId?: string;
}

export interface Caso {
  id: string; // e.g. "CASO-000001"
  codigoCaso: string;
  estado: EstadoCaso;
  origen: OrigenIncidencia; // TALLER | ALQUILER | RECLAMO_GARANTIA
  cliente: ClienteOrden;
  contratoAlquiler?: string; // Número o ref de contrato de alquiler si aplica
  equipo: EquipoOrden;
  responsableApertura: string;
  fechaApertura: string;
  fechaCierre?: string | null;
  
  // Expediente Único (Documentos y sub-entidades integradas)
  incidencias: IncidenciaCaso[];
  diagnosticos: DiagnosticoTecnicoCaso[];
  ordenesServicio: OrdenServicioTrabajo[];
  constancias: ConstanciaAtencionSimple[];
  garantia: GarantiaCaso;
  historial: ActividadHistorial[];

  // Datos de entrega técnica e Informe Final
  entrega?: {
    fechaEntrega: string;
    receptorNombre: string;
    receptorDniRuc?: string;
    observaciones?: string;
    responsableEntrega?: string;
  } | null;

  // Liquidación final
  liquidacionFinal?: {
    fechaLiquidacion: string;
    observaciones: string;
    firmadoPor: string;
  } | null;

  creadoEl: string;
  actualizadoEl: string;
}
