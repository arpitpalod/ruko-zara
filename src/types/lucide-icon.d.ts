// Type for one Lucide icon imported by its own path (lucide-react-native/icons/<name>).
// The package's own types for these paths are so large that `tsc` runs out of stack.
import type { ComponentType } from 'react';

declare const Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
export default Icon;
