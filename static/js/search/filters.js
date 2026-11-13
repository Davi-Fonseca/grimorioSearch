/* Filtros: decide se uma magia passa pelos filtros marcados. `skip` ignora um filtro (usado nas facetas). */

// Filtragem reversa (p.exclude): no filtro marcado como reverso, o que foi selecionado NÃO aparece.
// Círculo, escola e classe: some quem tiver qualquer um dos marcados.
// Componentes: some quem exigir qualquer um dos marcados.
// Características: some quem tiver concentração/ritual (conforme o que estiver marcado).
export const passes = (d, p, skip) => {
  const neg = (k) => p.exclude.includes(k);
  const comps = d.components || [];
  return (
    (skip === "levels" || !p.levels.length || p.levels.includes(d.level) !== neg("levels")) &&
    (skip === "schools" || !p.schools.length || p.schools.includes(d.school) !== neg("schools")) &&
    (skip === "classes" || !p.classes.length || d.classes.some((c) => p.classes.includes(c)) !== neg("classes")) &&
    (skip === "components" || !p.components.length ||
      (neg("components") ? !p.components.some((c) => comps.includes(c)) : p.components.every((c) => comps.includes(c)))) &&
    (!p.concentration || Boolean(d.concentration) !== neg("features")) &&
    (!p.ritual || Boolean(d.ritual) !== neg("features"))
  );
};
