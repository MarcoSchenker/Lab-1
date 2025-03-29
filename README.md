# Lab-1
Proyecto cuatrimestral de Laboratorio 1

## Archivos ignorados en `.gitignore`

A continuación, se detallan los archivos y directorios ignorados en el archivo `.gitignore` y la razón de su exclusión:

### Node.js
- **`node_modules/`**: Contiene las dependencias instaladas por Node.js. No se incluye en el repositorio porque puede regenerarse usando `package.json` y `package-lock.json`.
- **`.env`**: Archivo con variables de entorno sensibles (como claves API). No se comparte por razones de seguridad.

### Logs
- **`logs/`**: Carpeta que almacena logs generados por la aplicación.
- **`*.log`**: Archivos con extensión `.log`, que contienen información de depuración o errores.
- **`npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`**: Archivos de depuración generados por `npm` o `yarn` en caso de errores.

### Frontend - Vite
- **`dist/`**: Carpeta generada por herramientas como Vite o Webpack que contiene los archivos de producción. Se genera automáticamente.

### MacOS
- **`.DS_Store`**: Archivo oculto generado por macOS para almacenar metadatos de carpetas. No es relevante para el proyecto.

### Editor (VS Code)
- **`.vscode/`**: Configuraciones específicas de Visual Studio Code, como extensiones o configuraciones de depuración.
- **`.idea/`**: Configuraciones generadas por IDEs como IntelliJ o WebStorm.

### Backend - Coverage
- **`coverage/`**: Carpeta generada por herramientas de pruebas (como Jest) que contiene reportes de cobertura de código.

### Database dumps
- **`*.sql`**: Archivos de volcado de bases de datos (dumps). Suelen ser grandes y específicos del entorno local.
- **`*.sqlite`**: Archivos de bases de datos SQLite. No deben compartirse porque contienen datos locales.

### System files
- **`Thumbs.db`**: Archivo generado automáticamente por Windows para almacenar vistas en miniatura de imágenes. No es relevante para el proyecto.
