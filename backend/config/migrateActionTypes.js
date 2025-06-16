/**
 * Script de migración para tipos de acción
 * Migra los tipos de acción antiguos a los nuevos nombres consistentes
 */

const pool = require('./db.js');

async function migrarTiposAccion() {
    console.log('🔄 Iniciando migración de tipos de acción...');
    
    try {
        const connection = await pool.getConnection();
        
        // Verificar si la tabla existe
        const [tables] = await connection.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidas_acciones_historial'"
        );
        
        if (tables.length === 0) {
            console.log('✅ La tabla partidas_acciones_historial no existe aún. No es necesaria la migración.');
            connection.release();
            return;
        }
        
        // Verificar si hay datos que migrar
        const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM partidas_acciones_historial');
        const totalRecords = countResult[0].count;
        
        if (totalRecords === 0) {
            console.log('✅ La tabla está vacía. No es necesaria la migración de datos.');
            connection.release();
            return;
        }
        
        console.log(`📊 Encontrados ${totalRecords} registros en la tabla.`);
        
        // Verificar qué tipos de acción existen
        const [existingTypes] = await connection.execute(
            'SELECT tipo_accion, COUNT(*) as count FROM partidas_acciones_historial GROUP BY tipo_accion ORDER BY count DESC'
        );
        
        console.log('📋 Tipos de acción existentes:');
        let needsMigration = false;
        existingTypes.forEach(row => {
            console.log(`   - ${row.tipo_accion}: ${row.count} registros`);
            if (['CANTO_ENVIDO', 'CANTO_TRUCO', 'DECLARAR_PUNTOS_ENVIDO'].includes(row.tipo_accion)) {
                needsMigration = true;
            }
        });
        
        if (!needsMigration) {
            console.log('✅ No se encontraron tipos de acción que requieran migración.');
            connection.release();
            return;
        }
        
        console.log('🔄 Iniciando migración de datos...');
        
        // Migrar tipos de acción simples
        const migrations = [
            { from: 'CANTO_ENVIDO', to: 'CANTO_ENV' },
            { from: 'CANTO_TRUCO', to: 'CANT_TRU' },
            { from: 'DECLARAR_PUNTOS_ENVIDO', to: 'DECL_ENV' }
        ];
        
        for (const migration of migrations) {
            const [updateResult] = await connection.execute(
                'UPDATE partidas_acciones_historial SET tipo_accion = ? WHERE tipo_accion = ?',
                [migration.to, migration.from]
            );
            
            if (updateResult.affectedRows > 0) {
                console.log(`✅ Migrados ${updateResult.affectedRows} registros de '${migration.from}' a '${migration.to}'`);
            }
        }
        
        // Migrar RESPUESTA_CANTO (más complejo)
        const [respuestaCanto] = await connection.execute(
            'SELECT id, detalle_accion FROM partidas_acciones_historial WHERE tipo_accion = ?',
            ['RESPUESTA_CANTO']
        );
        
        if (respuestaCanto.length > 0) {
            console.log(`🔄 Migrando ${respuestaCanto.length} registros de RESPUESTA_CANTO...`);
            
            for (const record of respuestaCanto) {
                let newType = 'RESP_ENV'; // Default
                
                try {
                    const detalle = JSON.parse(record.detalle_accion);
                    // Si el detalle contiene información de truco, usar RESP_TRU
                    if (detalle.tipo_canto && ['TRUCO', 'RETRUCO', 'VALE_CUATRO'].includes(detalle.tipo_canto)) {
                        newType = 'RESP_TRU';
                    }
                } catch (e) {
                    // Si no se puede parsear el JSON, usar RESP_ENV por defecto
                }
                
                await connection.execute(
                    'UPDATE partidas_acciones_historial SET tipo_accion = ? WHERE id = ?',
                    [newType, record.id]
                );
            }
            
            console.log(`✅ Migrados ${respuestaCanto.length} registros de RESPUESTA_CANTO`);
        }
        
        // Verificar el resultado
        const [finalTypes] = await connection.execute(
            'SELECT tipo_accion, COUNT(*) as count FROM partidas_acciones_historial GROUP BY tipo_accion ORDER BY count DESC'
        );
        
        console.log('✅ Migración completada. Tipos de acción finales:');
        finalTypes.forEach(row => {
            console.log(`   - ${row.tipo_accion}: ${row.count} registros`);
        });
        
        connection.release();
        console.log('🎉 Migración completada exitosamente.');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        throw error;
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    migrarTiposAccion()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Error fatal:', error);
            process.exit(1);
        });
}

module.exports = { migrarTiposAccion };
