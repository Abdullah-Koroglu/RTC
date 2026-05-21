let _stream: MediaStream | null = null;

export function setCachedStream(s: MediaStream | null): void {
  _stream = s;
}

export function consumeCachedStream(): MediaStream | null {
  const s = _stream;
  _stream = null;
  return s;
}
