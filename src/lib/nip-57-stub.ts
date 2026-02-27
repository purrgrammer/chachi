// Stub for deleted nip-57 (zap protocol)
// All zap functionality has been removed

export type Zap = {
  id: string;
  amount: number;
  content: string;
  pubkey: string;
  p?: string;
  tags: string[][];
};

export function validateZap(_event: any): Zap | null {
  return null;
}

export function validateZapRequest(_raw: any, _invoice?: any): any {
  return null;
}
