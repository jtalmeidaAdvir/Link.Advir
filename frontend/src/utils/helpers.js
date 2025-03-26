export const limitText = (texto, limit) => {
    return texto.length > limit ? texto.substring(0, limit) : texto;
  };
  
  export const splitText = (text, chunkSize = 4000) => {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  };
  
  export const calculateTextHeight = (text) => {
    const avgCharHeight = 20;
    return text.length * avgCharHeight;
  };
  
  export const checkSpelling = (texto, dicionarioSimples) => {
    const palavras = texto.toLowerCase().match(/[a-záàâãéèêíïóôõöúçñ]+/g) || [];
    const erros = [];
    palavras.forEach((palavra) => {
      const palavraLimpa = palavra.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
      if (palavraLimpa.length > 3 && !dicionarioSimples.includes(palavraLimpa)) {
        if (!erros.includes(palavraLimpa)) {
          erros.push(palavraLimpa);
        }
      }
    });
    return erros;
  };
  