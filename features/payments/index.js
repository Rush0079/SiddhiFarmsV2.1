/**
 * @file features/payments/index.js
 * @description Public barrel exports for the Payments feature slice.
 */

export { default as UpiPaymentDialog } from './components/upi-payment-dialog/upi-payment-dialog'
export { default as PaymentsConfig } from './components/payments-config/payments-config'
export { PaymentService } from './services/payment.service'
export * from './models/payment.model'
