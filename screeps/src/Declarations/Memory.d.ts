
interface CreepMemory {
  type: CreepConstant;//found when used from creepType
  creationRoom: string;
  moveTarget: moveData | null;
  permTarget: targetData | null;
  targetQue: targetData[];
  //_currentTarget?: targetData | null;
}

interface Memory {
  uuid: number;
  log: any;
  respawncomplete: boolean;
  creepIndex: number;
  Resources: { [name: string]: SourceMemory };
  LevelTick: number[];
  MarketMem: MarketMemory;
  PishiMasterMem: PishiMasterMemory;
  ColonyMem: { [name: string]: ColonyMemory };
}

interface PishiMasterMemory {

}
interface BoostMemory {
  labID: number;
  boost: MineralBoostConstant;
  boostCost: number;
  nrCreep: number;
  boostTime: number;
}

interface LabMemory {
  ID: string;
  Index: number;
  state: LabStates;
  pushedStat: LabStates;
  resource: string;//or id to boost or reaction if reaction is tracable
}

interface FightInfo {
  nrAttack: number;
  target: string|null;
  lastT: string|null;
  healMult: number;
  healPower: number;
}

interface MarketMemory {
  sellPrices: { [res: string]: { price: number, energyCompPrice: number, lastPriceChange: number } };
  buyPrices: { [res: string]: { price: number, energyCompPrice: number, lastPriceChange: number } };
}

interface ColonyMemory {
  colonyType: number;
  outposts: string[];
  closestBoostCol: string | null;

  figthInfo: FightInfo | null;
  inCreepEmergency: number | null;
  sourcesUsed: string[];
  mineralsUsed: string[];
  startSpawnPos: posData | null;
  labPos: posData | null;

  ExpandedLevel: number;
  controllerStoreID: string | null;
  controllerLinkID: string | null;
  baseLinkID: string | null;
  wallEnergy: number;
  boosts: BoostMemory[];
  creepBuildQue: queData[];
  labMem: { [name: string]: LabMemory };
}

interface RoomMemory {
}
interface SpawnMemory {
  currentlySpawning: queData |null;
}

interface SourceMemory {
  pos: posData;
  usedByRoom: string;
  maxUser: number;
  workPos: posData;
  path: string;
  pathCost: number;
  container: string | null;
  linkID: string | null;
  lastDropID: string | null;
  resourceType: ResourceConstant;
}

interface FlagMemory {

}
