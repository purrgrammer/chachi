// Stub for deleted cashu functionality
// All cashu/ecash functionality has been removed

export const cashuRegex = /(cashu[AB][A-Za-z0-9_-]{0,10000}={0,3})/g;
export const cashuRequestRegex = /(creqA[A-Za-z0-9_-]{0,10000}={0,3})/g;

export function useMintInfo(_url: string) {
  return { data: null, isLoading: false };
}

export function useMintKeys(_url: string) {
  return { data: null, isLoading: false };
}

export function useMintList(_pubkey?: string) {
  return { data: null };
}

export function fetchMintInfo(_url: string): Promise<any> {
  return Promise.resolve(null);
}

export function fetchMintKeys(_url: string): Promise<any> {
  return Promise.resolve(null);
}
