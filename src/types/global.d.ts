declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_URL?: string;
      API_ENDPOINT?: string;
      DEVICE_ID?: string;
      COMPANY_ID?: string;
    }
  }

  var process: {
    env: NodeJS.ProcessEnv;
  };
}

export {};
