declare module 'picomatch' {
  interface PicomatchOptions {
    dot?: boolean
  }

  /** The small part of picomatch used by the page scanner. */
  export default function picomatch(
    patterns: string | string[],
    options?: PicomatchOptions,
  ): (path: string) => boolean
}
