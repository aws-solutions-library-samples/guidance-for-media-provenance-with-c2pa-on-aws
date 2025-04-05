/**
 * C2PA Dash Plugin TypeScript declarations
 */

export function c2pa_init(player: any, callback: (e: { c2pa_status: any }) => void): Promise<{
  getStatus: () => any;
  verifySegment: (segment: any) => Promise<boolean>;
}>;
