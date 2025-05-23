import { camelCase } from "lodash";

export const normalizeOptions: (
  options: Record<string, any>[]
) => Record<string, any> = (options: Record<string, any>[]) => {
  return Object.assign({}, ...options);
};
