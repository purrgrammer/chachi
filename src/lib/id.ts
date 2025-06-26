import { customAlphabet } from "nanoid";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const randomId = customAlphabet(alphabet, 16);
export const randomCode = customAlphabet(alphabet, 8);
