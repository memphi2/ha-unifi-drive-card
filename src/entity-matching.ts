import { objectIdFromEntityId, slugify } from "./format";
import type { EntityDefinition, HassRegistryEntity } from "./types";

const ALIAS_CACHE = new WeakMap<EntityDefinition, string[]>();

export function definitionAliases(definition: EntityDefinition): string[] {
  const cached = ALIAS_CACHE.get(definition);
  if (cached) {
    return cached;
  }
  const aliases = [definition.key, definition.label, ...(definition.aliases ?? [])]
    .map(slugify)
    .filter((alias, index, aliases) => Boolean(alias) && aliases.indexOf(alias) === index);
  ALIAS_CACHE.set(definition, aliases);
  return aliases;
}

export function definitionIdentityScore(
  definition: EntityDefinition,
  entityId: string,
  registry?: HassRegistryEntity,
): number {
  const aliases = definitionAliases(definition);
  const objectId = slugify(objectIdFromEntityId(entityId));
  const translationKey =
    typeof registry?.translation_key === "string" ? slugify(registry.translation_key) : "";
  const uniqueId = typeof registry?.unique_id === "string" ? slugify(registry.unique_id) : "";
  let score = 0;

  if (translationKey && aliases.includes(translationKey)) {
    score += 80;
  }
  if (uniqueId && aliases.some((alias) => uniqueId === alias || uniqueId.endsWith(`_${alias}`))) {
    score += 75;
  }
  if (aliases.some((alias) => objectId === alias || objectId.endsWith(`_${alias}`))) {
    score += 45;
  }
  return score;
}
