/**
 * Google Maps type declarations
 * Extends the Window interface to include the google object
 */

declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
