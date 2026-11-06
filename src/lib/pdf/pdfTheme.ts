import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ClienteOrden, EquipoOrden } from '@/types';
import { MUR_MARK_DATA_URI } from './murLogoAsset';

/**
 * Paleta corporativa minimalista MUR Tecnología S.A.C.
 * Blanco puro, negro carbón, celeste retro y gris institucional del isotipo.
 */
export const MUR_COLORS = {
  white: [255, 255, 255] as [number, number, number],
  black: [18, 21, 26] as [number, number, number],
  border: [38, 43, 50] as [number, number, number],
  logoGray: [125, 119, 119] as [number, number, number],
  mutedText: [88, 92, 99] as [number, number, number],
  retroCeleste: [82, 150, 197] as [number, number, number],
  retroCelesteSoft: [241, 247, 252] as [number, number, number],
  subtleLine: [210, 216, 224] as [number, number, number],
};

export const MUR_LAYOUT = {
  pageW: 210,
  pageH: 297,
  marginX: 11.5,
  boxW: 187, // 210 - 2 * 11.5
  col1LabelX: 14.8,
  col1ValueX: 49.0, // Eje vertical alineado para todo el documento
  col2LabelX: 117.5,
  col2ValueX: 151.0,
  boxGap: 3.1,
  targetBottomY: 278.5,
  footerBaselineY: 287.5,
  borderWidth: 0.25,
  accentBarWidth: 0.85,
};

let cachedCalibriRegular: string | null = null;
let cachedCalibriBold: string | null = null;
let fontLoadPromise: Promise<boolean> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

/**
 * Permite inyectar los buffers TTF en entornos sin fetch (ej. pruebas locales).
 */
export function registerCalibriFontBuffers(regularBase64: string, boldBase64: string): void {
  cachedCalibriRegular = regularBase64;
  cachedCalibriBold = boldBase64;
}

/**
 * Precarga asíncrona de la familia tipográfica Calibri desde /fonts/*.ttf en cliente.
 */
export function preloadPdfFonts(): Promise<boolean> {
  if (cachedCalibriRegular && cachedCalibriBold) {
    return Promise.resolve(true);
  }
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return Promise.resolve(false);
  }
  if (!fontLoadPromise) {
    fontLoadPromise = (async () => {
      try {
        const [regRes, boldRes] = await Promise.all([
          fetch('/fonts/calibri-regular.ttf'),
          fetch('/fonts/calibri-bold.ttf'),
        ]);
        if (!regRes.ok || !boldRes.ok) return false;
        const [regBuf, boldBuf] = await Promise.all([
          regRes.arrayBuffer(),
          boldRes.arrayBuffer(),
        ]);
        cachedCalibriRegular = arrayBufferToBase64(regBuf);
        cachedCalibriBold = arrayBufferToBase64(boldBuf);
        return true;
      } catch {
        return false;
      }
    })();
  }
  return fontLoadPromise;
}

// Iniciar precarga silenciosa en navegador apenas se importa el módulo
if (typeof window !== 'undefined') {
  void preloadPdfFonts();
}

/**
 * Crea una instancia A4 de jsPDF con la tipografía Calibri embebida (o fallback limpio).
 */
export async function createMurPdfDoc(): Promise<{ doc: jsPDF; fontFamily: string }> {
  await preloadPdfFonts();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  if (cachedCalibriRegular && cachedCalibriBold) {
    try {
      doc.addFileToVFS('Calibri-Regular.ttf', cachedCalibriRegular);
      doc.addFont('Calibri-Regular.ttf', 'Calibri', 'normal');
      doc.addFileToVFS('Calibri-Bold.ttf', cachedCalibriBold);
      doc.addFont('Calibri-Bold.ttf', 'Calibri', 'bold');
      doc.setFont('Calibri', 'normal');
      return { doc, fontFamily: 'Calibri' };
    } catch {
      // Fallback limpio si algún visor falla al registrar VFS
    }
  }

  doc.setFont('helvetica', 'normal');
  return { doc, fontFamily: 'helvetica' };
}

export function formatDateMur(val?: string | null, fallback = 'N/A'): string {
  if (!val) return fallback;
  try {
    return format(new Date(val), 'dd/MM/yyyy');
  } catch {
    return String(val);
  }
}

export function formatTimeMur(val?: string | null): string {
  if (!val) return '';
  try {
    return format(new Date(val), 'HH:mm');
  } catch {
    return '';
  }
}

export interface MurHeaderOptions {
  titulo: string;
  codigo: string;
  subtituloMeta?: string;
}

/**
 * Dibuja la cabecera oficial de 3 columnas de MUR Tecnología S.A.C.
 * Izquierda: Isotipo MUR® (celeste retro + gris logo).
 * Centro: Título en mayúsculas + código correlativo + línea acento celeste retro.
 * Derecha: Bloque institucional alineado (RUC y dirección).
 */
export function drawMurHeader(doc: jsPDF, fontFamily: string, opts: MurHeaderOptions): number {
  // 1. Isotipo vertical MUR® (izquierda)
  try {
    doc.addImage(MUR_MARK_DATA_URI, 'PNG', 13.2, 9.2, 16.4, 19.5, undefined, 'FAST');
  } catch {
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...MUR_COLORS.logoGray);
    doc.text('MUR', 14, 20);
  }

  // 2. Bloque central: Título + código
  const centerX = 97.5;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(14.2);
  doc.setTextColor(...MUR_COLORS.black);
  doc.text(opts.titulo.toUpperCase(), centerX, 16.2, { align: 'center' });

  // Línea "código: XXX" con prefijo en gris del logo y valor en negro
  const prefix = 'código: ';
  const codeVal = opts.codigo;
  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  const prefixW = doc.getTextWidth(prefix);
  doc.setFont(fontFamily, 'bold');
  const codeW = doc.getTextWidth(codeVal);
  const totalCodeW = prefixW + codeW;
  const startCodeX = centerX - totalCodeW / 2;

  doc.setFont(fontFamily, 'normal');
  doc.setTextColor(...MUR_COLORS.logoGray);
  doc.text(prefix, startCodeX, 22.3);

  doc.setFont(fontFamily, 'normal');
  doc.setTextColor(...MUR_COLORS.black);
  doc.text(codeVal, startCodeX + prefixW, 22.3);

  // Sutil acento horizontal en celeste retro bajo el código
  doc.setDrawColor(...MUR_COLORS.retroCeleste);
  doc.setLineWidth(0.55);
  doc.line(centerX - 11, 24.4, centerX + 11, 24.4);

  if (opts.subtituloMeta) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...MUR_COLORS.logoGray);
    doc.text(opts.subtituloMeta, centerX, 28.2, { align: 'center' });
  }

  // 3. Bloque institucional derecho (alineado en columna izquierda tal como la plantilla oficial)
  const rightBlockX = 157.5;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8.6);
  doc.setTextColor(...MUR_COLORS.black);
  doc.text('MUR TECNOLOGIA S.A.C.', rightBlockX, 13.0);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(8.6);
  doc.setTextColor(...MUR_COLORS.black);
  doc.text('RUC: 20603786301', rightBlockX, 16.8);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.9);
  doc.setTextColor(...MUR_COLORS.logoGray);
  doc.text('Jr. Rodin N.º 129, Dpto. 301', rightBlockX, 21.2);
  doc.text('Surquillo - Lima', rightBlockX, 24.8);

  return 32.5;
}

/**
 * Dibuja un contenedor rectangular minimalista con borde fino negro/carbón
 * y una delicada franja lateral interna en celeste retro.
 */
export function drawMinimalBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { withCelesteAccent?: boolean; fillSoftCeleste?: boolean }
): void {
  if (options?.fillSoftCeleste) {
    doc.setFillColor(...MUR_COLORS.retroCelesteSoft);
    doc.rect(x, y, w, h, 'F');
  } else {
    doc.setFillColor(...MUR_COLORS.white);
    doc.rect(x, y, w, h, 'F');
  }

  if (options?.withCelesteAccent !== false) {
    doc.setFillColor(...MUR_COLORS.retroCeleste);
    doc.rect(x + 0.12, y + 0.12, MUR_LAYOUT.accentBarWidth, h - 0.24, 'F');
  }

  doc.setDrawColor(...MUR_COLORS.border);
  doc.setLineWidth(MUR_LAYOUT.borderWidth);
  doc.rect(x, y, w, h, 'S');
}

export interface KeyValueRow {
  label: string;
  value: string;
}

/**
 * Caja 1: Datos del Cliente (izquierda) y Fechas / Metadatos de Registro (derecha).
 */
export function drawClientAndDatesBox(
  doc: jsPDF,
  fontFamily: string,
  startY: number,
  cliente: ClienteOrden,
  rightRows: KeyValueRow[]
): number {
  const leftRows: KeyValueRow[] = [
    { label: 'CLIENTE:', value: cliente.razonSocial || 'N/A' },
    { label: 'RUC/DNI:', value: cliente.ruc || 'N/A' },
    { label: 'NOMBRE DE CONTACTO:', value: cliente.contacto || 'N/A' },
    { label: 'TELÉFONO:', value: cliente.telefono || 'N/A' },
    { label: 'CORREO:', value: cliente.correo || 'N/A' },
  ];

  const fontSize = 8.7;
  const lineH = 4.35;
  const padTop = 3.6;
  const padBottom = 3.2;

  doc.setFontSize(fontSize);

  // Medir filas izquierdas (con wrap seguro antes de la columna derecha)
  const leftMaxX = MUR_LAYOUT.col2LabelX - 4;
  const preparedLeft = leftRows.map((row) => {
    doc.setFont(fontFamily, 'bold');
    const lw = doc.getTextWidth(row.label) + 2.6;
    const vx = MUR_LAYOUT.col1LabelX + lw;
    const availW = Math.max(30, leftMaxX - vx);
    doc.setFont(fontFamily, 'normal');
    const lines = doc.splitTextToSize(row.value || 'N/A', availW) as string[];
    return { ...row, vx, lines };
  });

  const rightMaxX = MUR_LAYOUT.marginX + MUR_LAYOUT.boxW - 3.2;
  const preparedRight = rightRows.map((row) => {
    doc.setFont(fontFamily, 'bold');
    const lw = doc.getTextWidth(row.label) + 2.6;
    const vx = Math.max(MUR_LAYOUT.col2ValueX, MUR_LAYOUT.col2LabelX + lw);
    const availW = Math.max(22, rightMaxX - vx);
    doc.setFont(fontFamily, 'normal');
    const lines = doc.splitTextToSize(row.value || 'N/A', availW) as string[];
    return { ...row, vx, lines };
  });

  const leftTotalLines = preparedLeft.reduce((acc, r) => acc + Math.max(1, r.lines.length), 0);
  const rightTotalLines = preparedRight.reduce((acc, r) => acc + Math.max(1, r.lines.length), 0);
  const boxH = padTop + Math.max(leftTotalLines, rightTotalLines) * lineH + padBottom - 0.8;

  drawMinimalBox(doc, MUR_LAYOUT.marginX, startY, MUR_LAYOUT.boxW, boxH);

  // Renderizar columna izquierda
  let cy = startY + padTop + 2.6;
  for (const r of preparedLeft) {
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(...MUR_COLORS.black);
    doc.text(r.label, MUR_LAYOUT.col1LabelX, cy);

    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(...MUR_COLORS.black);
    r.lines.forEach((ln, idx) => {
      doc.text(ln, r.vx, cy + idx * lineH);
    });
    cy += Math.max(1, r.lines.length) * lineH;
  }

  // Renderizar columna derecha
  let ry = startY + padTop + 2.6;
  for (const r of preparedRight) {
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(...MUR_COLORS.black);
    doc.text(r.label, MUR_LAYOUT.col2LabelX, ry);

    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(...MUR_COLORS.black);
    r.lines.forEach((ln, idx) => {
      doc.text(ln, r.vx, ry + idx * lineH);
    });
    ry += Math.max(1, r.lines.length) * lineH;
  }

  return startY + boxH + MUR_LAYOUT.boxGap;
}

/**
 * Caja 2: Datos del Equipo (Tipo, Marca, Modelo a la izquierda; Serie y PartNumber a la derecha).
 */
export function drawEquipmentBox(
  doc: jsPDF,
  fontFamily: string,
  startY: number,
  equipo: EquipoOrden,
  extraRightRow?: KeyValueRow
): number {
  const leftRows: KeyValueRow[] = [
    { label: 'TIPO DE EQUIPO:', value: equipo.tipoEquipo || 'Laptop' },
    { label: 'MARCA:', value: equipo.marca || 'N/A' },
    { label: 'MODELO:', value: equipo.modelo || 'N/A' },
  ];

  const rightRows: KeyValueRow[] = [
    { label: 'SERIE:', value: equipo.numeroSerie || 'N/A' },
    { label: 'PARTNUMBER:', value: equipo.partNumber || 'No especificado' },
  ];
  if (extraRightRow) {
    rightRows.push(extraRightRow);
  }

  const fontSize = 8.7;
  const lineH = 4.35;
  const padTop = 3.4;
  const padBottom = 3.0;
  const rowsCount = Math.max(leftRows.length, rightRows.length);
  const boxH = padTop + rowsCount * lineH + padBottom - 0.8;

  drawMinimalBox(doc, MUR_LAYOUT.marginX, startY, MUR_LAYOUT.boxW, boxH);

  let ly = startY + padTop + 2.6;
  for (const r of leftRows) {
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(...MUR_COLORS.black);
    doc.text(r.label, MUR_LAYOUT.col1LabelX, ly);

    doc.setFont(fontFamily, 'normal');
    const truncated = doc.splitTextToSize(r.value, MUR_LAYOUT.col2LabelX - MUR_LAYOUT.col1ValueX - 4)[0] || '';
    doc.text(truncated, MUR_LAYOUT.col1ValueX, ly);
    ly += lineH;
  }

  const eqRightValX = 145.5;
  let ry = startY + padTop + 2.6;
  for (const r of rightRows) {
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(...MUR_COLORS.black);
    doc.text(r.label, MUR_LAYOUT.col2LabelX, ry);

    doc.setFont(fontFamily, 'normal');
    const maxW = MUR_LAYOUT.marginX + MUR_LAYOUT.boxW - eqRightValX - 3;
    const truncated = doc.splitTextToSize(r.value, maxW)[0] || '';
    doc.text(truncated, eqRightValX, ry);
    ry += lineH;
  }

  return startY + boxH + MUR_LAYOUT.boxGap;
}

export interface LabeledSectionSpec {
  label: string; // Puede incluir \n ej. "ACCIÓN\nRECOMENDADA:"
  content: string;
  minHeight?: number;
  elastic?: boolean;
}

export interface MeasuredLabeledSection extends LabeledSectionSpec {
  labelLines: string[];
  contentLines: string[];
  naturalHeight: number;
  finalHeight: number;
}

/**
 * Pre-calcula el alto exacto de una lista de secciones etiquetadas para garantizar
 * ajuste limpio en 1 página A4 (expandiendo la caja elástica principal si sobra espacio).
 */
export function measureLabeledSections(
  doc: jsPDF,
  fontFamily: string,
  sections: LabeledSectionSpec[]
): MeasuredLabeledSection[] {
  const fontSize = 8.7;
  const lineH = 4.05;
  const padTop = 3.5;
  const padBottom = 3.5;
  const contentMaxW = MUR_LAYOUT.marginX + MUR_LAYOUT.boxW - MUR_LAYOUT.col1ValueX - 3.6;
  const labelMaxW = MUR_LAYOUT.col1ValueX - MUR_LAYOUT.col1LabelX - 2.5;

  return sections.map((sec) => {
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(fontSize);
    const rawLabelParts = sec.label.split('\n');
    const labelLines: string[] = [];
    for (const part of rawLabelParts) {
      const wrapped = doc.splitTextToSize(part, labelMaxW) as string[];
      labelLines.push(...wrapped);
    }

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(fontSize);
    const cleanText = (sec.content || 'Ninguno').trim() || 'Ninguno';
    const paragraphs = cleanText.split('\n');
    const contentLines: string[] = [];
    for (const p of paragraphs) {
      if (!p.trim()) {
        contentLines.push('');
      } else {
        const wrapped = doc.splitTextToSize(p, contentMaxW) as string[];
        contentLines.push(...wrapped);
      }
    }

    const totalLines = Math.max(labelLines.length, contentLines.length, 1);
    const calcH = padTop + totalLines * lineH + padBottom - 0.6;
    const naturalHeight = Math.max(sec.minHeight ?? 11.5, calcH);

    return {
      ...sec,
      labelLines,
      contentLines,
      naturalHeight,
      finalHeight: naturalHeight,
    };
  });
}

/**
 * Distribuye el espacio libre restante en la página 1 hacia la caja marcada como `elastic`
 * para mantener una separación uniforme de 3.1mm hasta el cuadro de CONSIDERACIONES.
 */
export function distributeElasticHeight(
  startY: number,
  measured: MeasuredLabeledSection[],
  reservedBottomHeight: number,
  maxExtraGrow = 48
): void {
  const sectionsHeight = measured.reduce((sum, s) => sum + s.naturalHeight, 0);
  const gapsHeight = Math.max(0, measured.length - 1) * MUR_LAYOUT.boxGap;
  const projectedEnd = startY + sectionsHeight + gapsHeight + reservedBottomHeight;

  if (projectedEnd < MUR_LAYOUT.targetBottomY) {
    const extra = Math.min(maxExtraGrow, MUR_LAYOUT.targetBottomY - projectedEnd);
    const elasticTarget = measured.find((m) => m.elastic) || measured[0];
    if (elasticTarget && extra > 0) {
      elasticTarget.finalHeight = elasticTarget.naturalHeight + extra;
    }
  }
}

export function ensurePageSpace(
  doc: jsPDF,
  fontFamily: string,
  currentY: number,
  neededHeight: number,
  headerOpts: MurHeaderOptions
): number {
  if (currentY + neededHeight <= MUR_LAYOUT.targetBottomY + 2) {
    return currentY;
  }
  doc.addPage();
  return drawMurHeader(doc, fontFamily, headerOpts);
}

/**
 * Dibuja una sección etiquetada individual previamente medida.
 */
export function drawMeasuredSection(
  doc: jsPDF,
  fontFamily: string,
  currentY: number,
  sec: MeasuredLabeledSection,
  headerOpts: MurHeaderOptions
): number {
  const y = ensurePageSpace(doc, fontFamily, currentY, sec.finalHeight, headerOpts);
  drawMinimalBox(doc, MUR_LAYOUT.marginX, y, MUR_LAYOUT.boxW, sec.finalHeight);

  const fontSize = 8.7;
  const lineH = 4.05;
  const textStartY = y + 3.5 + 2.6;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(...MUR_COLORS.black);
  sec.labelLines.forEach((ln, idx) => {
    doc.text(ln, MUR_LAYOUT.col1LabelX, textStartY + idx * lineH);
  });

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...MUR_COLORS.black);
  sec.contentLines.forEach((ln, idx) => {
    if (ln) {
      doc.text(ln, MUR_LAYOUT.col1ValueX, textStartY + idx * lineH);
    }
  });

  return y + sec.finalHeight + MUR_LAYOUT.boxGap;
}

export interface SignatureBlocksConfig {
  leftTitle: string;
  leftPrimary: string;
  leftSecondary?: string;
  rightTitle: string;
  rightPrimary: string;
  rightSecondary?: string;
}

/**
 * Dibuja dos recuadros minimalistas paralelos para firmas (Técnico / Conformidad o Usuario).
 */
export function drawSignatureBoxes(
  doc: jsPDF,
  fontFamily: string,
  currentY: number,
  cfg: SignatureBlocksConfig,
  headerOpts: MurHeaderOptions
): number {
  const boxH = 23.5;
  const y = ensurePageSpace(doc, fontFamily, currentY, boxH, headerOpts);
  const gap = 4.0;
  const singleW = (MUR_LAYOUT.boxW - gap) / 2;
  const leftX = MUR_LAYOUT.marginX;
  const rightX = MUR_LAYOUT.marginX + singleW + gap;

  // Caja izquierda
  drawMinimalBox(doc, leftX, y, singleW, boxH);
  // Caja derecha
  drawMinimalBox(doc, rightX, y, singleW, boxH);

  const drawSigContent = (
    bx: number,
    title: string,
    primary: string,
    secondary?: string
  ) => {
    const cx = bx + singleW / 2;
    // Línea de firma sutil en gris del logo
    doc.setDrawColor(...MUR_COLORS.logoGray);
    doc.setLineWidth(0.22);
    doc.line(bx + 14, y + 11.8, bx + singleW - 14, y + 11.8);

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...MUR_COLORS.black);
    doc.text(title.toUpperCase(), cx, y + 15.4, { align: 'center' });

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8.0);
    doc.setTextColor(...MUR_COLORS.black);
    const primTrunc = doc.splitTextToSize(primary || '', singleW - 8)[0] || '';
    doc.text(primTrunc, cx, y + 18.8, { align: 'center' });

    if (secondary) {
      doc.setFontSize(7.5);
      doc.setTextColor(...MUR_COLORS.logoGray);
      const secTrunc = doc.splitTextToSize(secondary, singleW - 8)[0] || '';
      doc.text(secTrunc, cx, y + 21.9, { align: 'center' });
    }
  };

  drawSigContent(leftX, cfg.leftTitle, cfg.leftPrimary, cfg.leftSecondary);
  drawSigContent(rightX, cfg.rightTitle, cfg.rightPrimary, cfg.rightSecondary);

  return y + boxH + MUR_LAYOUT.boxGap;
}

/**
 * Mide el alto exacto del recuadro inferior de CONSIDERACIONES.
 */
export function measureConsideracionesHeight(
  doc: jsPDF,
  fontFamily: string,
  textoCompleto: string
): { lines: string[]; height: number } {
  const fontSize = 7.7;
  const lineH = 3.45;
  const padY = 3.2;
  const maxW = MUR_LAYOUT.boxW - 6.8;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(textoCompleto, maxW) as string[];
  const height = padY * 2 + lines.length * lineH - 0.5;
  return { lines, height };
}

/**
 * Dibuja el cuadro inferior de CONSIDERACIONES con estilo idéntico al formato MUR.
 */
export function drawConsideracionesBox(
  doc: jsPDF,
  fontFamily: string,
  currentY: number,
  prefixBold: string,
  bodyText: string,
  headerOpts: MurHeaderOptions
): number {
  const fullText = `${prefixBold} ${bodyText}`.replace(/\s+/g, ' ').trim();
  const { lines, height } = measureConsideracionesHeight(doc, fontFamily, fullText);
  const y = ensurePageSpace(doc, fontFamily, currentY, height, headerOpts);

  drawMinimalBox(doc, MUR_LAYOUT.marginX, y, MUR_LAYOUT.boxW, height, {
    withCelesteAccent: true,
    fillSoftCeleste: true,
  });

  const fontSize = 7.7;
  const lineH = 3.45;
  const startX = MUR_LAYOUT.col1LabelX;
  let ty = y + 3.2 + 2.3;

  lines.forEach((ln, idx) => {
    if (idx === 0 && ln.startsWith(prefixBold)) {
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(...MUR_COLORS.black);
      doc.text(prefixBold, startX, ty);
      const pw = doc.getTextWidth(prefixBold) + 1.4;
      const rest = ln.slice(prefixBold.length).trimStart();
      doc.setFont(fontFamily, 'normal');
      doc.setTextColor(...MUR_COLORS.black);
      doc.text(rest, startX + pw, ty);
    } else {
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(...MUR_COLORS.black);
      doc.text(ln, startX, ty);
    }
    ty += lineH;
  });

  return y + height;
}

function drawVectorGlobe(doc: jsPDF, cx: number, cy: number, r: number): void {
  doc.setDrawColor(...MUR_COLORS.retroCeleste);
  doc.setLineWidth(0.28);
  doc.circle(cx, cy, r, 'S');
  doc.ellipse(cx, cy, r * 0.48, r, 'S');
  doc.line(cx - r, cy, cx + r, cy);
  doc.line(cx - r * 0.82, cy - r * 0.52, cx + r * 0.82, cy - r * 0.52);
  doc.line(cx - r * 0.82, cy + r * 0.52, cx + r * 0.82, cy + r * 0.52);
}

function drawVectorEnvelope(doc: jsPDF, x: number, cy: number, w: number, h: number): void {
  const top = cy - h / 2;
  doc.setDrawColor(...MUR_COLORS.retroCeleste);
  doc.setLineWidth(0.28);
  doc.rect(x, top, w, h, 'S');
  doc.line(x, top, x + w / 2, cy + 0.15);
  doc.line(x + w, top, x + w / 2, cy + 0.15);
}

function drawVectorPhone(doc: jsPDF, x: number, cy: number, w: number, h: number): void {
  const top = cy - h / 2;
  doc.setDrawColor(...MUR_COLORS.retroCeleste);
  doc.setLineWidth(0.28);
  // Auricular superior
  doc.roundedRect(x + 0.1, top, w - 0.2, h * 0.28, 0.35, 0.35, 'S');
  // Cuerpo del teléfono
  doc.roundedRect(x + 0.35, top + h * 0.34, w - 0.7, h * 0.66, 0.4, 0.4, 'S');
  // Disco central
  doc.circle(x + w / 2, top + h * 0.67, h * 0.16, 'S');
}

/**
 * Dibuja el pie de página institucional con íconos vectoriales en todas las páginas del documento.
 */
export function drawMurFooterAllPages(doc: jsPDF, fontFamily: string): void {
  const totalPages = doc.getNumberOfPages();
  const webText = 'www.mur-tecno.com.pe';
  const mailText = 'mesa.ayuda@mur-tecno.com.pe';
  const phoneText = '+51 913 220 480';
  const sep = '  |  ';

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    const y = MUR_LAYOUT.footerBaselineY;
    const iconY = y - 1.15;

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9.5);

    const iconSlot = 4.6;
    const wWeb = iconSlot + doc.getTextWidth(webText);
    const wSep = doc.getTextWidth(sep);
    const wMail = iconSlot + doc.getTextWidth(mailText);
    const wPhone = iconSlot + doc.getTextWidth(phoneText);
    const totalW = wWeb + wSep + wMail + wSep + wPhone;

    let curX = (MUR_LAYOUT.pageW - totalW) / 2;

    // 1. Web
    drawVectorGlobe(doc, curX + 1.8, iconY, 1.65);
    doc.setTextColor(...MUR_COLORS.black);
    doc.text(webText, curX + iconSlot, y);
    curX += wWeb;

    // Separador 1
    doc.setTextColor(...MUR_COLORS.logoGray);
    doc.text(sep, curX, y);
    curX += wSep;

    // 2. Correo
    drawVectorEnvelope(doc, curX + 0.3, iconY, 3.3, 2.3);
    doc.setTextColor(...MUR_COLORS.black);
    doc.text(mailText, curX + iconSlot, y);
    curX += wMail;

    // Separador 2
    doc.setTextColor(...MUR_COLORS.logoGray);
    doc.text(sep, curX, y);
    curX += wSep;

    // 3. Teléfono
    drawVectorPhone(doc, curX + 0.4, iconY, 3.1, 2.8);
    doc.setTextColor(...MUR_COLORS.black);
    doc.text(phoneText, curX + iconSlot, y);

    if (totalPages > 1) {
      doc.setFontSize(7.5);
      doc.setTextColor(...MUR_COLORS.logoGray);
      doc.text(`Pág. ${p}/${totalPages}`, MUR_LAYOUT.marginX + MUR_LAYOUT.boxW, y, {
        align: 'right',
      });
    }
  }
}
