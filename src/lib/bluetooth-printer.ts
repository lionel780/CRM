export type TicketLigne = { nom: string; quantite: number; prixUnitaire: number };

export type TicketData = {
  entreprise: string;
  ville?: string;
  telephone?: string;
  boutique: string;
  numero: string;
  date: string;
  lignes: TicketLigne[];
  total: number;
  mode: string;
  client?: string;
  clientTel?: string;
};

type GattCharacteristic = {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
};
type GattService = { getCharacteristics(): Promise<GattCharacteristic[]> };
type GattServer = {
  connected: boolean;
  connect(): Promise<GattServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<GattService[]>;
};
type BluetoothDevice = { name?: string; gatt?: GattServer };
type BluetoothLike = { requestDevice(options: unknown): Promise<BluetoothDevice> };

function getBluetooth(): BluetoothLike | undefined {
  return (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth;
}

export function bluetoothDisponible(): boolean {
  return typeof navigator !== "undefined" && !!getBluetooth();
}

function ascii(input: string): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function fcfa(n: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n)).replace(/[\u00A0\u202F]/g, " ")} F`;
}

function wrap(text: string, width: number): string[] {
  const words = ascii(text).split(/\s+/);
  const lines: string[] = [];
  let courant = "";
  for (const mot of words) {
    if ((courant + (courant ? " " : "") + mot).length > width) {
      if (courant) lines.push(courant);
      courant = mot.slice(0, width);
    } else {
      courant += `${courant ? " " : ""}${mot}`;
    }
  }
  if (courant) lines.push(courant);
  return lines.length ? lines : [""];
}

function deuxColonnes(gauche: string, droite: string, width: number): string {
  const g = ascii(gauche);
  const d = ascii(droite);
  const espace = Math.max(1, width - g.length - d.length);
  return `${g}${" ".repeat(espace)}${d}`;
}

const CMD = {
  init: [0x1b, 0x40],
  centre: [0x1b, 0x61, 0x01],
  gauche: [0x1b, 0x61, 0x00],
  grasOn: [0x1b, 0x45, 0x01],
  grasOff: [0x1b, 0x45, 0x00],
  doubleOn: [0x1d, 0x21, 0x11],
  doubleOff: [0x1d, 0x21, 0x00],
  feed: [0x1b, 0x64, 0x03],
  coupe: [0x1d, 0x56, 0x42, 0x00],
};

function construireTicket(ticket: TicketData, width = 32): Uint8Array {
  const parts: number[][] = [];
  const texte = (s: string) => parts.push(Array.from(new TextEncoder().encode(ascii(s))));
  const cmd = (c: number[]) => parts.push(c);

  cmd(CMD.init);
  cmd(CMD.centre);
  cmd(CMD.grasOn);
  texte(ticket.entreprise.toUpperCase());
  cmd(CMD.grasOff);
  if (ticket.ville || ticket.telephone) texte([ticket.ville, ticket.telephone].filter(Boolean).join(" - "));
  texte(ticket.boutique);
  texte("-".repeat(width));
  cmd(CMD.gauche);
  texte(`Ticket : ${ticket.numero}`);
  texte(ascii(new Date(ticket.date).toLocaleString("fr-FR")));
  texte(`Paiement : ${ticket.mode}`);
  if (ticket.client) texte(`Client : ${ticket.client}`);
  texte("-".repeat(width));

  for (const ligne of ticket.lignes) {
    const lignes = wrap(ligne.nom, width);
    texte(lignes[0]);
    for (const reste of lignes.slice(1)) texte(reste);
    texte(deuxColonnes(`  ${ligne.quantite} x ${fcfa(ligne.prixUnitaire)}`, fcfa(ligne.quantite * ligne.prixUnitaire), width));
  }

  texte("-".repeat(width));
  cmd(CMD.grasOn);
  texte(deuxColonnes("TOTAL", fcfa(ticket.total), width));
  cmd(CMD.grasOff);
  texte("");
  cmd(CMD.centre);
  texte("Merci de votre confiance !");
  texte("Boutika - Gestion PME CEMAC");
  cmd(CMD.feed);
  cmd(CMD.coupe);

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function trouverCaracteristique(server: GattServer): Promise<GattCharacteristic | null> {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const caracteristiques = await service.getCharacteristics();
    for (const c of caracteristiques) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c;
    }
  }
  return null;
}

export async function printTicketBluetooth(ticket: TicketData): Promise<string> {
  const bluetooth = getBluetooth();
  if (!bluetooth) {
    throw new Error("Web Bluetooth n'est pas disponible sur ce navigateur. Utilisez Chrome/Edge, ou l'impression navigateur.");
  }

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [0xffe0, 0xffe1, 0xff00, 0x18f0, 0x18f1, 0x1800],
  });
  if (!device.gatt) throw new Error("Imprimante Bluetooth incompatible (GATT indisponible).");

  const server = await device.gatt.connect();
  try {
    const caracteristique = await trouverCaracteristique(server);
    if (!caracteristique) throw new Error("Aucune caractéristique d'écriture trouvée sur l'imprimante.");

    const data = construireTicket(ticket);
    const sansReponse = !caracteristique.properties.write && caracteristique.properties.writeWithoutResponse;
    for (let i = 0; i < data.length; i += 100) {
      const morceau = data.slice(i, i + 100);
      if (sansReponse && caracteristique.writeValueWithoutResponse) {
        await caracteristique.writeValueWithoutResponse(morceau);
      } else {
        await caracteristique.writeValue(morceau);
      }
      await new Promise((r) => setTimeout(r, 30));
    }
    return device.name ?? "Imprimante Bluetooth";
  } finally {
    if (server.connected) server.disconnect();
  }
}

export function printTicketNavigateur(ticket: TicketData): void {
  const lignes = ticket.lignes
    .map(
      (l) =>
        `<tr><td>${escape(l.nom)}</td><td class="r">${l.quantite} x ${escape(fcfa(l.prixUnitaire))}</td><td class="r">${escape(fcfa(l.quantite * l.prixUnitaire))}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${escape(ticket.numero)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: ui-monospace, "Courier New", monospace; font-size: 12px; color: #000; width: 72mm; margin: 0 auto; }
    h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
    .c { text-align: center; margin: 2px 0; }
    .sep { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; }
    .r { text-align: right; white-space: nowrap; }
    .total { font-weight: bold; font-size: 14px; }
  </style></head><body>
    <h1>${escape(ticket.entreprise.toUpperCase())}</h1>
    <div class="c">${escape([ticket.ville, ticket.telephone].filter(Boolean).join(" - "))}</div>
    <div class="c">${escape(ticket.boutique)}</div>
    <div class="sep"></div>
    <div>Ticket : ${escape(ticket.numero)}</div>
    <div>${escape(new Date(ticket.date).toLocaleString("fr-FR"))}</div>
    <div>Paiement : ${escape(ticket.mode)}</div>
    ${ticket.client ? `<div>Client : ${escape(ticket.client)}</div>` : ""}
    <div class="sep"></div>
    <table>${lignes}</table>
    <div class="sep"></div>
    <div class="total"><table><tr><td>TOTAL</td><td class="r">${escape(fcfa(ticket.total))}</td></tr></table></div>
    <div class="sep"></div>
    <div class="c">Merci de votre confiance !</div>
    <div class="c">Boutika - Gestion PME CEMAC</div>
  </body></html>`;

  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    document.body.removeChild(frame);
    throw new Error("Impossible de préparer l'impression.");
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => document.body.removeChild(frame), 1000);
  };
}

function escape(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
