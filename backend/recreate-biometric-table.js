
const { sequelize } = require('./config/db');
const BiometricCredential = require('./models/biometricCredential');

async function recreateBiometricTable() {
    try {
        console.log('🔄 Iniciando recriação da tabela biometric_credentials...');
        
        // Primeiro, eliminar a tabela se existir
        await sequelize.query('DROP TABLE IF EXISTS biometric_credentials');
        console.log('✅ Tabela antiga eliminada');
        
        // Recriar a tabela com a estrutura correta
        await BiometricCredential.sync({ force: true });
        console.log('✅ Tabela biometric_credentials recriada com sucesso!');
        
        // Verificar a estrutura da nova tabela
        const [results] = await sequelize.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'biometric_credentials'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('📋 Estrutura da nova tabela:');
        results.forEach(col => {
            console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
        });
        
        console.log('🎉 Recriação concluída com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao recriar tabela:', error);
    } finally {
        await sequelize.close();
    }
}

recreateBiometricTable();
