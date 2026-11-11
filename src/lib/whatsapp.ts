export function whatsappUrl(telephone: string | undefined, message: string): string {
  const digits = (telephone ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function messageRappel(clientNom: string, entreprise: string, montant: number): string {
  const formate = new Intl.NumberFormat("fr-FR").format(Math.round(montant));
  return `Bonjour ${clientNom}, votre solde chez ${entreprise} est de ${formate} FCFA. Merci de régulariser votre situation.`;
}
