// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson

/**
 * System prompt template for chatbot configuration.
 *
 * Templates allow users to save and switch between different system prompts
 * for different tasks (e.g., document analysis, creative writing, coding).
 */

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
