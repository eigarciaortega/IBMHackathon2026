export type ResourceType = 'ROOM' | 'DESK';

export interface Resource {
  publicId: string;
  name: string;
  type: ResourceType;
  capacity: number;
  features: Record<string, unknown>;
  location: string;
  active: boolean;
}

export interface ResourceRequest {
  name: string;
  type: ResourceType;
  capacity: number;
  features: Record<string, unknown>;
  location: string;
}

export interface ResourceFilters {
  type?: ResourceType;
  minCapacity?: number;
}
