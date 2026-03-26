/** Detect the page language from element attribute, document, or navigator. */
export function detectLanguage(el: HTMLElement): string {
  return el.getAttribute('lang')
    ?? document.documentElement.lang?.split('-')[0]
    ?? navigator.language?.split('-')[0]
    ?? 'de';
}
