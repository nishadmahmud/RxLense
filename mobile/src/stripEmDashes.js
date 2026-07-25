/** Replace em/en dashes so UI copy stays clean. */
export function stripEmDashes(text) {
  if (text == null) return text;
  return String(text)
    .replace(/\u2014/g, ' - ')
    .replace(/\u2013/g, '-')
    .replace(/ \- /g, ' - ')
    .replace(/  +/g, ' ');
}
