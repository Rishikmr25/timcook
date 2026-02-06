
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  NONE = 'NONE'
}

export enum ThreatType {
  GESTURE = 'Silent Distress Signal',
  PHYSICAL = 'Potential Physical Threat Between Individuals',
  OBJECT = 'Unauthorized/Illegal Object',
  BEHAVIOR = 'Suspicious Behavior',
  NONE = 'None'
}

export interface DetectionResult {
  threatLevel: ThreatLevel;
  threatType: ThreatType;
  description: string;
  confidence: number;
  objectsDetected: string[];
  recommendation: string;
  timestamp: number;
  cameraId: string;
  location?: string;
}

export interface LogEntry extends DetectionResult {
  id: string;
  snapshot: string;
}

export interface CameraConfig {
  id: string;
  name: string;
  isActive: boolean;
  isAnalyzing: boolean;
  lastResult: DetectionResult | null;
}
