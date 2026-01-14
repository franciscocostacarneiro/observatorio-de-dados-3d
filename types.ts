
export enum ViewMode {
  GRID = 'GRID',
  UNIVERSE = 'UNIVERSE',
  ADMIN = 'ADMIN'
}

export interface Panel {
  id: string;
  title: string;
  source: string;
  description: string;
  longDescription: string;
  url: string;
  thumbnail: string;
  tags: string[];
  status: 'Publicado' | 'Rascunho';
  createdAt: string;
  group?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  thumbnail: string;
  tags: string[];
  description: string;
  color?: string;
  group?: string;
  // Propriedades de Órbita
  orbitRadius?: number;
  orbitSpeed?: number;
  orbitPhase?: number;
  yOffset?: number;
  // Propriedades do Force Graph 3D para posicionamento estático inicial
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
