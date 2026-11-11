import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

const A4: [number, number] = [595.28, 841.89];
const EMERALD = rgb(0.02, 0.59, 0.41);
const DARK = rgb(0.08, 0.1, 0.09);
const GRAY = rgb(0.42, 0.45, 0.44);
const LIGHT = rgb(0.965, 0.97, 0.955);
const BORDER = rgb(0.88, 0.9, 0.88);
const HEADER = rgb(0.09, 0.13, 0.11);
const ZEBRA = rgb(0.982, 0.985, 0.976);

export type LignePdf = { nom: string; quantite: number; prixUnitaire: number };

export type DocumentPdf = {
  type: "facture" | "recu" | "devis";
  numero: string;
  date: Date | string;
  echeance?: Date | string;
  validite?: Date | string;
  clientNom?: string;
  clientTel?: string;
  boutiqueNom?: string;
  lignes: LignePdf[];
  sousTotal: number;
  tva?: number;
  total: number;
  modePaiement?: string;
  logo?: string;
  entreprise: { nom: string; ville: string; telephone: string };
};

async function embedLogo(pdf: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  try {
    const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl.trim());
    if (!match) return null;
    const bytes = Buffer.from(match[2], "base64");
    return match[1].toLowerCase() === "png" ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

function safe(input: string): string {
  return String(input ?? "")
    .normalize("NFC")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/€/g, "EUR")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");
}

function fcfaPdf(n: number): string {
  const s = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n));
  return `${s.replace(/[\u00A0\u202F]/g, " ")} FCFA`;
}

function datePdf(d: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).format(new Date(d));
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const t = safe(text);
  if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;
  let s = t;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}...`, size) > maxWidth) {
    s = s.slice(0, -1);
  }
  return `${s}...`;
}

function rightText(
  page: PDFPage,
  text: string,
  xRight: number,
  y: number,
  size: number,
  font: PDFFont,
  color = DARK,
) {
  const t = safe(text);
  page.drawText(t, {
    x: xRight - font.widthOfTextAtSize(t, size),
    y,
    size,
    font,
    color,
  });
}

function drawTableHeader(page: PDFPage, M: number, innerW: number, y: number, bold: PDFFont) {
  page.drawRectangle({ x: M, y: y - 8, width: innerW, height: 24, color: HEADER });
  page.drawText("DESIGNATION", { x: M + 10, y, size: 8, font: bold, color: rgb(1, 1, 1) });
  rightText(page, "QTE", M + innerW - 160, y, 8, bold, rgb(1, 1, 1));
  rightText(page, "PRIX UNIT.", M + innerW - 60, y, 8, bold, rgb(1, 1, 1));
  rightText(page, "TOTAL", M + innerW - 12, y, 8, bold, rgb(1, 1, 1));
}

export async function genererDocumentPdf(doc: DocumentPdf): Promise<Uint8Array<ArrayBuffer>> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage(A4);
  const W = A4[0];
  const H = A4[1];
  const M = 46;
  const innerW = W - M * 2;
  const isFacture = doc.type === "facture";
  const isDevis = doc.type === "devis";
  const titre = isFacture ? "FACTURE" : isDevis ? "DEVIS" : "REÇU";
  const logo = doc.logo ? await embedLogo(pdf, doc.logo) : null;

  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: EMERALD });

  let texteX = M;
  if (logo) {
    const dims = logo.scale(1);
    const scale = Math.min(130 / dims.width, 46 / dims.height, 1);
    page.drawImage(logo, { x: M, y: H - 96, width: dims.width * scale, height: dims.height * scale });
    texteX = M + 130 + 14;
  } else {
    page.drawText("BOUTIKA", { x: M, y: H - 50, size: 9, font: bold, color: EMERALD });
  }

  let y = H - 72;
  const largeurTexte = innerW - (texteX - M) - 170;
  page.drawText(fit(doc.entreprise.nom, bold, 17, largeurTexte), {
    x: texteX,
    y,
    size: 17,
    font: bold,
    color: DARK,
  });
  y -= 16;
  page.drawText(fit(`${doc.entreprise.ville} · ${doc.entreprise.telephone}`, font, 9, largeurTexte), {
    x: texteX,
    y,
    size: 9,
    font,
    color: GRAY,
  });

  rightText(page, titre, W - M, H - 64, 22, bold, DARK);
  rightText(page, doc.numero, W - M, H - 84, 11, bold, EMERALD);
  rightText(page, datePdf(doc.date), W - M, H - 100, 9, font, GRAY);
  if (isFacture && doc.echeance) {
    rightText(page, `Echeance : ${datePdf(doc.echeance)}`, W - M, H - 114, 9, font, GRAY);
  }
  if (isDevis && doc.validite) {
    rightText(page, `Validite : ${datePdf(doc.validite)}`, W - M, H - 114, 9, font, GRAY);
  }

  y = H - 132;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: BORDER });

  y = H - 150;
  const boxH = 58;
  page.drawRectangle({ x: M, y: y - boxH, width: innerW, height: boxH, color: LIGHT });
  page.drawText("CLIENT", { x: M + 14, y: y - 15, size: 8, font: bold, color: GRAY });
  page.drawText(fit(doc.clientNom || "Client comptoir", bold, 12, innerW * 0.55), {
    x: M + 14,
    y: y - 32,
    size: 12,
    font: bold,
    color: DARK,
  });
  if (doc.clientTel) {
    page.drawText(safe(doc.clientTel), { x: M + 14, y: y - 47, size: 9, font, color: GRAY });
  }
  if (doc.boutiqueNom) {
    rightText(page, `Boutique : ${doc.boutiqueNom}`, W - M - 14, y - 15, 8, font, GRAY);
  }
  if (doc.type === "recu" && doc.modePaiement) {
    rightText(page, `Paiement : ${doc.modePaiement}`, W - M - 14, y - 34, 10, bold, EMERALD);
  }

  y = y - boxH - 30;
  drawTableHeader(page, M, innerW, y, bold);
  y -= 26;

  const colDesc = M + 10;
  const colQte = M + innerW - 160;
  const colPU = M + innerW - 60;
  const colTotal = M + innerW - 12;

  doc.lignes.forEach((l, i) => {
    if (y < 170) {
      page = pdf.addPage(A4);
      page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: EMERALD });
      page.drawText("BOUTIKA", { x: M, y: H - 40, size: 9, font: bold, color: EMERALD });
      rightText(page, `${titre} ${doc.numero} (suite)`, W - M, H - 40, 9, font, GRAY);
      y = H - 62;
      drawTableHeader(page, M, innerW, y, bold);
      y -= 26;
    }

    if (i % 2 === 0) {
      page.drawRectangle({ x: M, y: y - 7, width: innerW, height: 22, color: ZEBRA });
    }
    page.drawText(fit(l.nom, font, 9.5, innerW - 210), { x: colDesc, y, size: 9.5, font, color: DARK });
    rightText(page, String(l.quantite), colQte, y, 9.5, font, DARK);
    rightText(page, fcfaPdf(l.prixUnitaire), colPU, y, 9.5, font, DARK);
    rightText(page, fcfaPdf(l.prixUnitaire * l.quantite), colTotal, y, 9.5, bold, DARK);
    y -= 22;
    page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.5, color: BORDER });
  });

  y -= 14;
  const boxW = 230;
  const labelX = W - M - boxW;
  const valueX = W - M - 2;

  if (isFacture || isDevis) {
    rightText(page, "Sous-total", labelX, y, 9.5, font, GRAY);
    rightText(page, fcfaPdf(doc.sousTotal), valueX, y, 9.5, font, DARK);
    y -= 16;
    rightText(page, `TVA`, labelX, y, 9.5, font, GRAY);
    rightText(page, fcfaPdf(doc.tva ?? 0), valueX, y, 9.5, font, DARK);
    y -= 14;
  }

  page.drawRectangle({ x: labelX - 12, y: y - 30, width: boxW + 14, height: 32, color: EMERALD });
  page.drawText("TOTAL", { x: labelX, y: y - 20, size: 11, font: bold, color: rgb(1, 1, 1) });
  rightText(page, fcfaPdf(doc.total), valueX, y - 21, 13, bold, rgb(1, 1, 1));

  const footerY = 56;
  page.drawLine({ start: { x: M, y: footerY + 14 }, end: { x: W - M, y: footerY + 14 }, thickness: 0.5, color: BORDER });
  page.drawText("Merci de votre confiance.", { x: M, y: footerY, size: 8, font, color: GRAY });
  rightText(page, "Genere par Boutika - Gestion PME CEMAC", W - M, footerY, 8, font, GRAY);

  return new Uint8Array(await pdf.save());
}
