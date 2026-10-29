const SECTION_LABELS: Record<string, string> = {
  TITULO: 'Título',
  CAPITULO: 'Capítulo',
  LIBRO: 'Libro',
  SECCION: 'Sección',
  PARTE: 'Parte',
};

const ORDINALS: Record<string, string> = {
  PRIMERO: 'Primero',
  SEGUNDO: 'Segundo',
  TERCERO: 'Tercero',
  CUARTO: 'Cuarto',
  QUINTO: 'Quinto',
  SEXTO: 'Sexto',
  SEPTIMO: 'Séptimo',
  SÉPTIMO: 'Séptimo',
  OCTAVO: 'Octavo',
  NOVENO: 'Noveno',
  DECIMO: 'Décimo',
  DÉCIMO: 'Décimo',
  UNICO: 'Único',
  ÚNICO: 'Único',
};

const SEP = '\u0001';

function titleCaseWord(word: string): string {
  const upper = word.toUpperCase();
  if (ORDINALS[upper]) return ORDINALS[upper];
  if (/^[IVXLCDM]+$/.test(upper)) return upper;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCaseOrdinals(value: string): string {
  return value.split(/\s+/).map(titleCaseWord).join(' ');
}

function normalizeArticle(value: string): string {
  const v = value.trim().replace(/[.,;]+$/, '');
  if (!v) return '';
  if (/^unico$/i.test(v) || /^único$/i.test(v)) return 'Art. Único';
  if (/^\d+[a-z]?(-\w+)?$/i.test(v)) return `Art. ${v.toUpperCase()}`;
  return `Texto ${v.toUpperCase()}`;
}

function wrap(text: string): string {
  return `${SEP}${text}${SEP}`;
}

/**
 * Convierte el campo legalBasis del banco de preguntas (formato crudo)
 * en una nota legible, p. ej.:
 *   "(ART: 2)** [TITULO I] [CAPITULO I]"
 *   -> "Art. 2 · Título I · Capítulo I"
 *   "(ART: 11) (item: 49)** [TITULO II] [CAPITULO I]"
 *   -> "Art. 11 · Ítem 49 · Título II · Capítulo I"
 *   "(texto: (ART: UNICO)**Articulo IV. Titular de la accion Penal)**"
 *   -> "Art. Único · Articulo IV. Titular de la accion Penal"
 */
export function formatLegalBasis(raw?: string): string {
  if (!raw) return '';

  let s = raw.replace(/\*\*/g, ' ').replace(/\s+/g, ' ').trim();

  // (texto: (ART: X) ... ) -> "Art. X · ..."
  s = s.replace(
    /\(\s*texto\s*:\s*\(\s*art\s*:\s*([^)]+?)\)\s*/gi,
    (_, v: string) => wrap(normalizeArticle(v))
  );

  // (ART: X) -> "Art. X"
  s = s.replace(/\(\s*art\s*:\s*([^)]+?)\)/gi, (_, v: string) => wrap(normalizeArticle(v)));

  // (texto: X) -> "Art. X" / "Texto X"
  s = s.replace(/\(\s*texto\s*:\s*([^)]+?)\)/gi, (_, v: string) => wrap(normalizeArticle(v)));

  // (item: N) -> "Ítem N"
  s = s.replace(/\(\s*item\s*:\s*([^)]+?)\)/gi, (_, v: string) => wrap(`Ítem ${v.trim()}`));

  // [TITULO I] -> "Título I", [LIBRO PRIMERO] -> "Libro Primero"
  s = s.replace(
    /\[\s*(TITULO|CAPITULO|LIBRO|SECCION|PARTE)\s+([^\]]+?)\s*\]/gi,
    (_, key: string, value: string) => {
      const label = SECTION_LABELS[key.toUpperCase()] || key;
      return wrap(`${label} ${titleCaseOrdinals(value.trim())}`);
    }
  );

  // Paréntesis y signos sueltos
  s = s.replace(/[()]/g, ' ');
  s = s.replace(/\s+([.,;])/g, '$1');

  const parts = s
    .split(SEP)
    .map(part => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return parts.join(' · ');
}
