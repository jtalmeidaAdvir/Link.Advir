
import CryptoJS from 'crypto-js';

// Chave de encriptação - em produção, esta deveria vir de variável de ambiente
// ou ser gerada dinamicamente no login
const ENCRYPTION_KEY = process.env.REACT_APP_STORAGE_KEY || 'AdvirLink-2024-SecureKey-Change-In-Production';

/**
 * SecureStorage - Wrapper para localStorage com encriptação automática
 */
class SecureStorage {
    /**
     * Encripta dados usando AES
     */
    _encrypt(data) {
        try {
            return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
        } catch (error) {
            console.error('Erro ao encriptar dados:', error);
            return null;
        }
    }

    /**
     * Desencripta dados usando AES
     */
    _decrypt(ciphertext) {
        try {
            const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Erro ao desencriptar dados:', error);
            return null;
        }
    }

    /**
     * Guarda item encriptado no localStorage
     */
    setItem(key, value) {
        try {
            const encrypted = this._encrypt(String(value));
            if (encrypted) {
                localStorage.setItem(key, encrypted);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao guardar no secureStorage:', error);
            return false;
        }
    }

    /**
     * Obtém e desencripta item do localStorage
     */
    getItem(key) {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;
            
            return this._decrypt(encrypted);
        } catch (error) {
            console.error('Erro ao ler do secureStorage:', error);
            return null;
        }
    }

    /**
     * Remove item do localStorage
     */
    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Erro ao remover do secureStorage:', error);
            return false;
        }
    }

    /**
     * Limpa todo o localStorage
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Erro ao limpar secureStorage:', error);
            return false;
        }
    }

    /**
     * Migra dados não encriptados para encriptados
     */
    migrateFromPlainStorage(keys) {
        try {
            keys.forEach(key => {
                const plainValue = localStorage.getItem(key);
                if (plainValue) {
                    // Tenta desencriptar - se falhar, é porque está em texto plano
                    const decrypted = this._decrypt(plainValue);
                    if (!decrypted || decrypted === '') {
                        // É texto plano, encriptar
                        this.setItem(key, plainValue);
                        console.log(`Migrado: ${key}`);
                    }
                }
            });
        } catch (error) {
            console.error('Erro na migração:', error);
        }
    }
}

// Exportar instância única
export const secureStorage = new SecureStorage();

// Exportar também a classe para casos especiais
export default SecureStorage;
