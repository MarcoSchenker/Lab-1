// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/authMiddleware');
const paymentController = require('./paymentController');

// Inicializar tablas necesarias para pagos
paymentController.setupPaymentTables();

// Rutas protegidas (requieren autenticación)
router.post('/pagos/crear', authenticateToken, paymentController.createPayment);
router.get('/pagos/status/:paymentId', authenticateToken, paymentController.checkPaymentStatus);
router.get('/pagos/historial', authenticateToken, paymentController.getTransactionHistory);

// Webhook de MercadoPago (no requiere autenticación)
router.post('/pagos/webhook', paymentController.handleWebhook);

module.exports = router;