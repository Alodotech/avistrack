/**
 * Nettoyage des saisies libres (T23).
 *
 * Les textes publiés par les visiteurs sont conservés en base et relus dans
 * les tableaux de bord. Ils sont donc nettoyés à l'entrée : plus aucune balise
 * HTML, plus aucun caractère de contrôle, et une longueur bornée.
 */

/** Balises HTML, y compris les balises non fermées. */
const HTML_TAG = /<[^>]*>/g;

/** Caractères de contrôle, hors tabulation et saut de ligne. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Espaces multiples et sauts de ligne superflus. */
const SPACES = /[ \t]{2,}/g;
const BLANK_LINES = /\n{3,}/g;

/**
 * Nettoie un texte saisi par un utilisateur.
 *
 * @param value Texte brut, tel que reçu du formulaire
 * @param maxLength Longueur maximale conservée
 */
export function sanitizeText(value: string, maxLength: number): string {
  return value
    .replace(HTML_TAG, " ")
    .replace(/[<>]/g, "")
    .replace(CONTROL_CHARS, "")
    .replace(SPACES, " ")
    .replace(BLANK_LINES, "\n\n")
    .trim()
    .slice(0, maxLength);
}
