import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

interface Settings {
  devMode?: boolean;
}

export const settingsAtom = atomWithStorage<Settings>(
  "settings",
  {
    devMode: false,
  },
  createJSONStorage<Settings>(() => localStorage),
  { getOnInit: true },
);

export function useSettings() {
  return useAtom(settingsAtom);
}
