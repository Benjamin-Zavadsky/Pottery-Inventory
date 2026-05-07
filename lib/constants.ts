export const CASES = [
  { id: 'A', name: 'A — Left Tower', description: 'Tall case on the far left wall' },
  { id: 'B', name: 'B — Center Left', description: 'Long low case, center left' },
  { id: 'C', name: 'C — Center Right', description: 'Long low case, center right' },
  { id: 'D', name: 'D — Right Tower', description: 'Tall case on the far right wall' },
  { id: 'B-top', name: 'B — Center Left, Top Surface', description: 'Pieces on top of Case B' },
  { id: 'C-top', name: 'C — Center Right, Top Surface', description: 'Pieces on top of Case C' },
] as const;

export const CASE_IDS = CASES.map((c) => c.id);
export type CaseId = (typeof CASES)[number]['id'];
