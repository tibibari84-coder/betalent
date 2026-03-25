/**
 * Minimal typings for react-simple-maps (package ships without .d.ts).
 * Must stay ambient (no top-level import/export) so this is a module declaration, not augmentation.
 */
declare module 'react-simple-maps' {
  import type { CSSProperties, FC, ReactNode } from 'react';

  export interface RsmGeography {
    rsmKey: string;
    properties: Record<string, unknown>;
  }

  export interface ComposableMapProps {
    projectionConfig?: { scale?: number; [key: string]: unknown };
    style?: CSSProperties;
    children?: ReactNode;
  }

  export const ComposableMap: FC<ComposableMapProps>;

  export interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (data: { geographies: RsmGeography[] }) => ReactNode;
  }

  export const Geographies: FC<GeographiesProps>;

  export interface GeographyProps {
    geography: RsmGeography;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
    style?: Record<string, CSSProperties>;
  }

  export const Geography: FC<GeographyProps>;
}
