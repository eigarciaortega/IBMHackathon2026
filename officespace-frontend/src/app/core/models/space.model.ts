export type SpaceType = 'SALA' | 'DESK';

export interface Space {
  id: number;
  name: string;
  type: SpaceType;
  capacity: number;
  floor: string;
  hasProjector: boolean;
  hasAC: boolean;
  hasWhiteboard: boolean;
  hasTV: boolean;
  hasVideoConf: boolean;
  isAvailable?: boolean;
  isUnderMaintenance?: boolean;
  maintenanceUntil?: string | null;
  maintenanceReason?: string | null;
}

export interface SpaceCreateRequest {
  name: string;
  type: SpaceType;
  capacity: number;
  floor: string;
  hasProjector: boolean;
  hasAC: boolean;
  hasWhiteboard: boolean;
  hasTV: boolean;
  hasVideoConf: boolean;
}

export interface SpaceAvailabilityParams {
  date: string;       // ISO date yyyy-MM-dd
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  type?: SpaceType;
  minCapacity?: number;
}
