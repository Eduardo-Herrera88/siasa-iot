export const RULE_INCLUDE = {
  triggers: true,
  conditions: true,
  actions: { orderBy: { order: "asc" as const } },
} as const;
