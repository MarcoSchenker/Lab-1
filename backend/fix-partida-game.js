#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to PartidaGame.js
const partidaGamePath = path.join(__dirname, 'game-logic', 'PartidaGame.js');

// Read the file content
console.log(`Reading file: ${partidaGamePath}`);
const content = fs.readFileSync(partidaGamePath, 'utf8');

// Fix the syntax error - properly close the try-catch block in obtenerEstadoGlobalParaCliente
const fixedContent = content.replace(
  /    \} catch \(error\) \{\s+console\.error\(`\[PARTIDA\] Error al preparar estado global para cliente: \${error\.message}\`, error\);\s+return \{\s+codigoSala: this\.codigoSala,\s+tipoPartida: this\.tipoPartida,\s+estadoPartida: 'error',\s+mensajeError: 'Error al obtener estado de la partida',\s+errorDetail: error\.message\s+\};/,
  `    } catch (error) {
        console.error(\`[PARTIDA] Error al preparar estado global para cliente: \${error.message}\`, error);
        return {
            codigoSala: this.codigoSala,
            tipoPartida: this.tipoPartida,
            estadoPartida: 'error',
            mensajeError: 'Error al obtener estado de la partida',
            errorDetail: error.message
        };
    }`
);

// Write the fixed content back to the file
fs.writeFileSync(partidaGamePath, fixedContent, 'utf8');
console.log('Fixed syntax error in PartidaGame.js');
