declare module 'pako' {
  type InflateOptions = {
    to?: 'string' | 'uint8array'
  }
  
  export function inflate(data: Uint8Array | ArrayBuffer, options?: InflateOptions): string | Uint8Array
  export function deflate(data: string | Uint8Array | ArrayBuffer, options?: InflateOptions): Uint8Array
  
  const pako: {
    inflate: (data: Uint8Array | ArrayBuffer, options?: InflateOptions) => string | Uint8Array
    deflate: (data: string | Uint8Array | ArrayBuffer, options?: InflateOptions) => Uint8Array
  }
  
  export default pako
}

