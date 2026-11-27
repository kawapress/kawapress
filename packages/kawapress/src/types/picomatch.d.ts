declare module 'picomatch' {
  interface PicomatchOptions {
    dot?: boolean
  }

  /** The small part of picomatch used by the page scanner and the page dependency tracker. */
  function picomatch(
    patterns: string | string[],
    options?: PicomatchOptions,
  ): (path: string) => boolean

  namespace picomatch {
    /** Splits a pattern into its static `base` directory and the glob after it. */
    function scan(pattern: string): { base: string, glob: string, isGlob: boolean }
  }

  export default picomatch
}
