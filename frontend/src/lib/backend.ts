declare const process: {
  env: Record<string, string | undefined>;
};

export const backendBaseUrl = process.env.BACKEND_URL ?? 'http://localhost:3333';
