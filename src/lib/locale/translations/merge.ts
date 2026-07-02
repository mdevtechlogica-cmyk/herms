import { en, type TranslationTree } from "./en";

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T extends Record<string, unknown>>(base: T, partial: DeepPartial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(partial) as (keyof T)[]) {
    const baseValue = base[key];
    const partialValue = partial[key];
    if (partialValue === undefined) continue;
    if (isPlainObject(baseValue) && isPlainObject(partialValue)) {
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        partialValue as DeepPartial<Record<string, unknown>>,
      ) as T[keyof T];
    } else {
      result[key] = partialValue as T[keyof T];
    }
  }
  return result;
}

export function mergeTranslations(partial: DeepPartial<TranslationTree>): TranslationTree {
  return deepMerge(en as unknown as Record<string, unknown>, partial as DeepPartial<Record<string, unknown>>) as TranslationTree;
}
