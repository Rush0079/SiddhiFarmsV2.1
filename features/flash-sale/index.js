/**
 * @file features/flash-sale/index.js
 * @description Public barrel exports for the Flash Sale feature slice.
 */

export { default as FlashSaleBanner } from './components/flash-sale-banner/flash-sale-banner'
export { default as FlashSaleScheduler } from './components/flash-sale-scheduler/flash-sale-scheduler'
export { FlashSaleService } from './services/flash-sale.service'
export * from './models/flash-sale.model'
