// AI Services have been removed.
// These functions are kept as stubs to maintain type compatibility if referenced elsewhere.

export const refineMessage = async (text: string, tone: 'professional' | 'casual' | 'cryptic'): Promise<string> => {
  return text;
};

export const translateMessage = async (text: string, targetLang: string = 'Vietnamese'): Promise<string> => {
  return text;
};

export const analyzeSecurity = async (conversation: string): Promise<string> => {
  return "AI Security Analysis is disabled in this version.";
};