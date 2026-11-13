/* Texto: normalização, palavras comuns, radical simples e distância de edição.
   Tudo aqui é puro (sem DOM), então roda no navegador e no Node (testes). */

export const fold = (s) =>
  String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const tokenize = (s) => fold(s).split(/[^a-z0-9]+/).filter(Boolean);

// Palavras comuns que não ajudam a achar nada (lista do analisador "portuguese", sem acentos)
export const STOP = new Set((
  "de a o que e do da em um para com nao uma os no se na por mais as dos como mas ao ele das seu sua ou " +
  "quando muito nos ja eu tambem so pelo pela ate isso ela entre depois sem mesmo aos seus quem nas me " +
  "esse eles voce essa num nem suas meu as minha numa pelos elas qual nos lhe deles essas esses pelas " +
  "este dele tu te voces vos lhes meus minhas teu tua teus tuas nosso nossa nossos nossas dela delas " +
  "esta estes estas aquele aquela aqueles aquelas isto aquilo"
).split(" "));

// Radical simples: tira plural e vogal final ("chamas" e "chama" -> "cham")
export function stem(t) {
  if (t.length < 4) return t;
  if (/(oes|aes)$/.test(t)) t = t.slice(0, -3) + "ao";
  else if (/ais$/.test(t)) t = t.slice(0, -3) + "al";
  else if (/eis$/.test(t)) t = t.slice(0, -3) + "el";
  else if (t.endsWith("s") && t.length > 3) t = t.slice(0, -1);
  if (t.length >= 5 && /[aeo]$/.test(t)) t = t.slice(0, -1);
  return t;
}

// Distância de edição (inclui troca de letras vizinhas) com limite
export function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  const n = a.length, m = b.length;
  let prev2 = null;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev2 = prev; prev = cur;
  }
  return prev[m] <= max;
}

// 0 a 4 letras: exato; 5 a 8: 1 erro; 9 ou mais: 2 erros (como o fuzziness AUTO:5,9)
export const maxEdits = (len) => (len < 5 ? 0 : len < 9 ? 1 : 2);
