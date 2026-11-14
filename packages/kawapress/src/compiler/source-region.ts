/**
 * Region markers that mark part of a file for `<<<` and `<!--@include-->`. A
 * region starts with a `region <name>` comment and ends with the matching
 * `endregion <name>` comment, written in the comment syntax of the language.
 */
const REGION_MARKERS: readonly RegExp[] = [
  // JavaScript, TypeScript, Java, Go, Rust
  /^\/\/ ?#?((?:end)?region) ([\w*-]+)$/,
  // CSS, Less, SCSS
  /^\/\* ?#((?:end)?region) ([\w*-]+) ?\*\/$/,
  // C, C++
  /^#pragma ((?:end)?region) ([\w*-]+)$/,
  // HTML, Markdown, Vue templates
  /^<!-- #?((?:end)?region) ([\w*-]+) -->$/,
  // Visual Basic
  /^#((?:End )?Region) ([\w*-]+)$/,
  // Batch
  /^::#((?:end)?region) ([\w*-]+)$/,
  // Python, shell, YAML, PHP, C#, PowerShell
  /^# ?((?:end)?region) ([\w*-]+)$/,
]

export interface SourceRegion {
  /** Index of the first line inside the region. */
  start: number
  /** Index of the line holding the end marker. */
  end: number
  /** Marker syntax of this region, used to drop nested markers. */
  marker: RegExp
}

/** The first region called `name`, or `undefined` when the file has none. */
export function findSourceRegion(
  lines: readonly string[],
  name: string,
): SourceRegion | undefined {
  let marker: RegExp | undefined
  let start = -1

  for (const [index, line] of lines.entries()) {
    if (!marker) {
      marker = REGION_MARKERS.find(candidate => isRegionMarker(line, candidate, name, false))
      start = index + 1
    }
    else if (isRegionMarker(line, marker, name, true)) {
      return { start, end: index, marker }
    }
  }
}

/** Whether `line` is any region marker written in the syntax of `marker`. */
export function isAnyRegionMarker(line: string, marker: RegExp): boolean {
  return marker.test(line.trim())
}

function isRegionMarker(
  line: string,
  marker: RegExp,
  name: string,
  end: boolean,
): boolean {
  const [, tag, markerName] = marker.exec(line.trim()) ?? []
  if (!tag || markerName !== name) {
    return false
  }
  return end ? /^end ?region$/i.test(tag) : /^region$/i.test(tag)
}

/** Removes the indentation every non-blank line shares. */
export function dedent(text: string): string {
  const lines = text.split('\n')
  const indent = Math.min(...lines
    .filter(line => line.trim())
    .map(line => line.length - line.trimStart().length))
  return Number.isFinite(indent) && indent > 0
    ? lines.map(line => line.slice(indent)).join('\n')
    : text
}
