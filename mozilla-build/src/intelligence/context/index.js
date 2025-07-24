/**
 * Context extraction module exports
 */

export { ContentAnalyzer } from './ContentAnalyzer.js';
export { ContextOptimizer } from './ContextOptimizer.js';
export { SmartContextExtractor } from './SmartContextExtractor.js';

// Create and export a singleton instance for convenience
import { SmartContextExtractor } from './SmartContextExtractor.js';
export const contextExtractor = new SmartContextExtractor();