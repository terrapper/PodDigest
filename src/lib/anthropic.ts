// Centralized Anthropic client for Claude API calls
// All services import from here instead of creating their own client instances

import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
