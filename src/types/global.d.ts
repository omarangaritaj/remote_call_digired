declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_URL?: string;
      API_ENDPOINT?: string;
      DEVICE_ID?: string;
      COMPANY_ID?: string;
      PORT?: string;
      NODE_ENV?: string;
      [key: string]: string | undefined;
    }
  }

  var process: {
    env: NodeJS.ProcessEnv;
    uptime(): number;
    memoryUsage(): {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    exit(code?: number): never;
  };

  // Declaración para el módulo fs
  declare module 'fs' {
    export function readFileSync(path: string, options?: { encoding?: string }): string | Buffer;
    export function writeFileSync(path: string, data: string | Buffer): void;
    export function existsSync(path: string): boolean;
    export function readFile(path: string, callback: (err: Error | null, data: Buffer) => void): void;
    export function readFile(path: string, options: { encoding: string }, callback: (err: Error | null, data: string) => void): void;
    export function writeFile(path: string, data: string | Buffer, callback: (err: Error | null) => void): void;
    // Agrega más funciones de fs según las necesites
  }
}

export {};
