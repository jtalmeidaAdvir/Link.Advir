export const fetchWithRetry = async (url, options, maxRetries = 3, delayMs = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      const errorData = await response.text();
      lastError = new Error(`Status: ${response.status}. ${errorData}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < maxRetries - 1) {
      await new Promise(res => setTimeout(res, delayMs * (attempt + 1)));
    }
  }

  throw lastError || new Error("Falha após múltiplas tentativas");
};
