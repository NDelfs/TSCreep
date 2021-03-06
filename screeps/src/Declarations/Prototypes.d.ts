type Sink = StructureSpawn |
  StructureExtension |
  StructureLab |
  StructurePowerSpawn |
  StructureNuker |
  StructureTower |
  StructureContainer;

type StorageUnit = StructureContainer | StructureTerminal | StructureStorage;

type rechargeObjectType = StructureStorage
  | StructureTerminal
  | StructureContainer
  | StructureLink
  | Tombstone
  | Resource;



interface getCreepsType {
  (creepType: CreepConstant): Creep[];
}

interface Source {
  memory: SourceMemory;
}

interface Mineral {
  memory: SourceMemory;
}

interface StructureLab {
  memory: LabMemory;
}

interface Resource {
  store: { [resource: string]: number};
}

interface Room {
  my: boolean;
  creepsInRoom: Creep[];
  creeps: { [creepType: number]: Creep[] };
  getCreeps: getCreepsType;
  creepsAll: Creep[];
  hostiles: Creep[];
  invaders: Creep[];
  structures: Structure[];
  myStructures: Structure[];
  constructionSites: ConstructionSite[];
  drops: { [resourceType: string]: Resource[] };
  droppedEnergy: Resource[];
}

interface Creep {
  creationRoom: string;
  type: CreepConstant;
  carryAmount: number;
  //currentTarget: targetData | null;
  //targetQue: targetData[];
  inPlace: boolean;
  walk: () => void;
  walkTo: (pos: posData, rang: number) => void;
  walkToPos: (x: number, y: number, room: string, rang: number) => void;
  addTarget: (id: string, type: TargetConstant, pos: posData, rang: number) => void;
  addTargetT: (iTarget: targetData) => void;
  addTargetFirst: (iTarget: targetData) => void;
  getTarget: () => targetData | null;
  alreadyTarget: (iID: string) => boolean;
  completeTarget: () => void;
  _walk: boolean;
}
