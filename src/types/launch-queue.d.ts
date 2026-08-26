// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Type declarations for the Web App Launch Queue API.
 * @see https://wicg.github.io/web-app-launch/
 *
 * These types are not yet in TypeScript's standard lib.dom.d.ts as of 5.x,
 * so we declare the minimal surface we consume.
 */

interface LaunchParams {
  /** Files the app was launched to open (file association / protocol handler). */
  readonly files: ReadonlyArray<FileSystemFileHandle>;
  /**
   * The URL the app was launched against. May differ from start_url when a
   * file handler routes through a specific path.
   */
  readonly targetURL?: string;
}

interface LaunchQueue {
  /**
   * Register a consumer to handle launch params. Each launch is delivered
   * exactly once to the first consumer registered.
   */
  setConsumer(consumer: (params: LaunchParams) => Promise<void> | void): void;
}

interface Window {
  /**
   * Present when the app is launched as an installed PWA with a registered
   * file handler. Absent in plain tab mode.
   */
  launchQueue?: LaunchQueue;
}
