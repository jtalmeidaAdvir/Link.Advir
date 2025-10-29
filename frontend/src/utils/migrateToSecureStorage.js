
import { secureStorage } from './secureStorage';

/**
 * Migra todos os dados sensíveis do localStorage para secureStorage
 * Execute este script UMA VEZ após implementar o secureStorage
 */
export const migrateToSecureStorage = () => {
    console.log('🔄 Iniciando migração para secureStorage...');

    const keysToMigrate = [
        // Tokens
        'loginToken',
        'painelAdminToken',
        'painelAdminTokenAdvir',
        'posToken',
        
        // Dados do usuário
        'userId',
        'userNome',
        'userEmail',
        'username',
        'email',
        'isAdmin',
        'superAdmin',
        'isPOS',
        
        // Empresa
        'empresaSelecionada',
        'urlempresa',
        'urlempresaAdvir',
        'empresa_id',
        'empresa_areacliente',
        
        // Dados técnicos
        'id_tecnico',
        'tipoUser',
        'codFuncionario',
        'codRecursosHumanos',
        
        // POS
        'posId',
        'posNome',
        'posCodigo',
        'posEmail',
        'posObraId',
        'posObraNome',
        
        // Obra
        'obra_predefinida_id',
        'obra_predefinida_nome'
    ];

    let migratedCount = 0;
    let errorCount = 0;

    keysToMigrate.forEach(key => {
        try {
            const value = localStorage.getItem(key);
            if (value) {
                // Verificar se já está encriptado
                try {
                    const testDecrypt = secureStorage.getItem(key);
                    if (!testDecrypt || testDecrypt === '') {
                        // Não está encriptado, migrar
                        secureStorage.setItem(key, value);
                        migratedCount++;
                        console.log(`✅ Migrado: ${key}`);
                    } else {
                        console.log(`⏭️  Já encriptado: ${key}`);
                    }
                } catch {
                    // Erro ao desencriptar = não está encriptado
                    secureStorage.setItem(key, value);
                    migratedCount++;
                    console.log(`✅ Migrado: ${key}`);
                }
            }
        } catch (error) {
            console.error(`❌ Erro ao migrar ${key}:`, error);
            errorCount++;
        }
    });

    console.log(`✅ Migração concluída: ${migratedCount} itens migrados, ${errorCount} erros`);
    
    // Marcar migração como concluída
    secureStorage.setItem('_migrationCompleted', 'true');
    
    return { migratedCount, errorCount };
};

/**
 * Verifica se a migração já foi executada
 */
export const isMigrationCompleted = () => {
    return secureStorage.getItem('_migrationCompleted') === 'true';
};

export default migrateToSecureStorage;
