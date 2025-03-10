const urlRegex =
  /((?:http|ftp|https|nostr|web\+nostr|magnet|lnurl[p|w]?):\/?\/?(?:[\w+?.\w+])+(?:[\p{L}\p{N}~!@#$%^&*()_\-=+\\/?.:;',]*)?(?:[-a-z0-9+&@#/%=~()_|]))/iu;

const fileExtensionRegex = /\.([\w]{1,7})$/i;

export function isURL(content: string) {
  return urlRegex.test(content);
}

//export function isNostrURL(s: string) {
//  try {
//    if (!isURL(s)) return false;
//    const url = new URL(s);
//    return url.protocol === 'nostr:';
//  } catch (err) {
//    return false;
//  }
//}

function isURLWithExtension(s: string, extensions: string[]) {
  try {
    if (!isURL(s)) return false;
    const url = new URL(s);
    const extension = url.pathname.match(fileExtensionRegex);
    return extension && extension.length > 1
      ? extensions.includes(extension[1])
      : false;
  } catch {
    return false;
  }
}

export function isImageLink(s: string) {
  return isURLWithExtension(s, ["jpg", "jpeg", "png", "gif", "webp", "ico"]);
}

export function isVideoLink(s: string) {
  return isURLWithExtension(s, ["mp4", "ogg", "avi", "mov", "webm"]);
}

export function isAudioLink(s: string) {
  return isURLWithExtension(s, ["mp3", "wav", "ogg", "aac"]);
}
