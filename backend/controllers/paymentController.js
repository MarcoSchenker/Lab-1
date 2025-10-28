const mysql = require('mysql2/promise');
require('dotenv').config();

// Configurar SDK de MercadoPago
//nacu hace npm install --save mercadopago y pone esto en el .env del back
// MERCADOPAGO_ACCESS_TOKEN=TEST-3573059625962722-051115-e4f758360f86205afee48f344de4e3be-2431656045
// FRONTEND_URL=http://localhost:5173
// BACKEND_URL=http://localhost:3001
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const preference = new Preference(mp);
const payment = new Payment(mp);

// Función para crear una conexión a la base de datos
const getConnection = async () => {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: 'truco_db'
  });
};

// Crear una preferencia de pago en Mercado Pago
const createPayment = async (req, res) => {


  const { packageId, price, coins } = req.body;
  const userId = req.user.id;

  console.log('FRONTEND_URL desde env:', process.env.FRONTEND_URL);
console.log('Success URL:', `${process.env.FRONTEND_URL}/store?status=approved&package=${packageId}`);
console.log('Failure URL:', `${process.env.FRONTEND_URL}/store?status=rejected&package=${packageId}`);
console.log('Pending URL:', `${process.env.FRONTEND_URL}/store?status=pending&package=${packageId}`);

  if (!packageId || !price || !coins) {
    return res.status(400).json({ message: 'Faltan datos para procesar el pago' });
  }

  try {
      console.log('FRONTEND_URL desde env:', process.env.FRONTEND_URL);

    // Crear preferencia de pago en Mercado Pago
    const preferenceData = {
            items: [
                {
                title: `${coins} Monedas para Truco Game`,           // requerido (string)
                description: `Paquete de ${coins} monedas`,           // opcional (string)
                quantity: 1,                                           // requerido (number)
                currency_id: 'ARS',                                   // requerido (string)
                unit_price: parseFloat(Number(price).toFixed(2)), // requerido (number)
                }
            ],
            back_urls: {
                success: `${process.env.FRONTEND_URL}/store?status=approved&package=${packageId}`,
                failure: `${process.env.FRONTEND_URL}/store?status=rejected&package=${packageId}`,
                pending: `${process.env.FRONTEND_URL}/store?status=pending&package=${packageId}`
            },
            auto_return: 'approved',
            external_reference: `${userId}-${packageId}`,
            notification_url: `${process.env.BACKEND_URL}/api/pagos/webhook`
            };


        console.log('Preference a enviar:', JSON.stringify(preferenceData, null, 2));

        const response = await preference.create({ body: preferenceData });
    
    // Guardar la referencia de pago en la base de datos
    const connection = await getConnection();
await connection.query(
  `INSERT INTO pagos (usuario_id, package_id, coins, price, payment_id, status, created_at)
   VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
  [userId, packageId, coins, price, response.id]
);

return res.status(200).json({
  init_point: response.init_point,
  id: response.id
});

  } catch (error) {
    console.error('Error al crear pago:', error);
    return res.status(500).json({ message: 'Error al procesar la solicitud de pago' });
  }
};

// Webhook para recibir notificaciones de Mercado Pago
const handleWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    // Solo procesamos notificaciones de tipo 'payment'
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Obtener detalles del pago desde la API de Mercado Pago
        const paymentData = await payment.get({ id: paymentId });

      
      if (paymentData && paymentData.body) {
        const paymentStatus = paymentData.body.status;
        const externalReference = paymentData.body.external_reference;
        
        // Extraer userId y packageId del external_reference
        const [userId, packageId] = externalReference.split('-').map(Number);
        
        // Obtener información sobre el paquete de monedas
        const connection = await getConnection();
        
        // Verificar si ya se procesó este pago (para evitar duplicados)
        const [existingPayments] = await connection.query(
          `SELECT * FROM pagos WHERE payment_id = ? AND status = 'approved'`,
          [paymentId]
        );
        
        if (existingPayments.length > 0) {
          await connection.end();
          return res.status(200).send('OK');
        }
        
        // Actualizar el estado del pago
        await connection.query(
          `UPDATE pagos SET status = ?, updated_at = NOW() WHERE payment_id = ?`,
          [paymentStatus, paymentId]
        );
        
        // Si el pago fue aprobado, acreditamos las monedas al usuario
        if (paymentStatus === 'approved') {
          // Encontrar detalles del pago en nuestra base de datos
          const [paymentDetails] = await connection.query(
            `SELECT coins FROM pagos WHERE payment_id = ?`,
            [paymentId]
          );
          
          if (paymentDetails.length > 0) {
            const coinsToAdd = paymentDetails[0].coins;
            
            // Actualizar las monedas del usuario
            await connection.query(
              `UPDATE perfiles SET monedas = monedas + ? WHERE usuario_id = ?`,
              [coinsToAdd, userId]
            );
            
            // Registrar la transacción
            await connection.query(
              `INSERT INTO transacciones_monedas (usuario_id, cantidad, tipo, descripcion, fecha)
               VALUES (?, ?, 'compra', 'Compra de monedas con MercadoPago', NOW())`,
              [userId, coinsToAdd]
            );
            
            console.log(`Pago aprobado: Se acreditaron ${coinsToAdd} monedas al usuario ${userId}`);
          }
        }
        
        await connection.end();
      }
    }
    
    // Siempre responder con éxito para que MercadoPago no reintente
    return res.status(200).send('OK');
    
  } catch (error) {
    console.error('Error al procesar webhook:', error);
    return res.status(500).send('Error');
  }
};

// Verificar el estado de un pago
const checkPaymentStatus = async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user.id;
  
  if (!paymentId) {
    return res.status(400).json({ message: 'ID de pago no proporcionado' });
  }
  
  try {
    const connection = await getConnection();
    
    // Verificar si el pago existe y pertenece al usuario
    const [payments] = await connection.query(
      `SELECT * FROM pagos WHERE payment_id = ? AND usuario_id = ?`,
      [paymentId, userId]
    );
    
    await connection.end();
    
    if (payments.length === 0) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }
    
    return res.status(200).json({ 
      status: payments[0].status,
      coins: payments[0].coins,
      date: payments[0].updated_at || payments[0].created_at
    });
    
  } catch (error) {
    console.error('Error al verificar estado del pago:', error);
    return res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
};

// Obtener historial de transacciones del usuario
const getTransactionHistory = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const connection = await getConnection();
    
    const [transactions] = await connection.query(
      `SELECT * FROM transacciones_monedas 
       WHERE usuario_id = ? 
       ORDER BY fecha DESC 
       LIMIT 50`,
      [userId]
    );
    
    await connection.end();
    
    return res.status(200).json({ transactions });
    
  } catch (error) {
    console.error('Error al obtener historial de transacciones:', error);
    return res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
};

// Crear tabla de pagos si no existe
const setupPaymentTables = async () => {
  try {
    const connection = await getConnection();
    
    // Crear tabla de pagos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pagos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        package_id INT NOT NULL,
        coins INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        payment_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    
    // Crear tabla de transacciones de monedas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transacciones_monedas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        cantidad INT NOT NULL,
        tipo ENUM('compra', 'gasto', 'ganancia', 'regalo') NOT NULL,
        descripcion VARCHAR(255) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    
    await connection.end();
    console.log('Tablas de pago configuradas correctamente');
    
  } catch (error) {
    console.error('Error al configurar tablas de pago:', error);
  }
};

module.exports = {
  createPayment,
  handleWebhook,
  checkPaymentStatus,
  getTransactionHistory,
  setupPaymentTables
};