// example declaration file - remove these and add your own custom typings
// memory extension samples
type TargetConstant =
    | CONTROLLER
    | POWERUSER
    | POWERSTORAGE
    | SOURCE
    | DROPPED_ENERGY
    | CONSTRUCTION
    | REPAIR
    | POSITION
    | FLAG_RED
    | FLAG_WHITE
    | DEFEND;

type TargetEnergy =
    | SOURCE
    | DROPPED_ENERGY;

type CONTROLLER = 1;
type POWERUSER = 11;
type POWERSTORAGE = 12;
type SOURCE = 21;
type DROPPED_ENERGY = 31;
type CONSTRUCTION = 41;
type REPAIR = 45;
type POSITION = 51;
type DEFEND = 61
type FLAG_RED = 100;
type FLAG_WHITE = 190;

type CreepConstant =
    | STARTER
    | HARVESTER
    | UPGRADER
    | TRANSPORTER
    | BUILDER
    | SCOUT
    | DEFENDER
    | ATTACKER
    | ATTACKERCONTROLLER;

type STARTER = 1;
type HARVESTER = 11;
type UPGRADER = 21;
type TRANSPORTER = 31;
type BUILDER = 41;
type SCOUT = 51;
type DEFENDER = 61
type ATTACKER = 71;
type ATTACKERCONTROLLER = 75;


interface targetData {
    ID: string;
    type: TargetConstant;
    pos: posData;
    range: number;
}

interface CreepMemory {
    type: CreepConstant;//found when used from creepType
    creationRoom: string;
    currentTarget: targetData | null;
    mainTarget: string; //used by i.e harvesters. creeps not using this has ""
    permTarget: targetData | null;
}

interface posData {
    /**
     * The name of the room.
     */
    roomName: string;
    /**
     * X position in the room.
     */
    x: number;
    /**
     * Y position in the room.
     */
    y: number;
}

interface Memory {
  uuid: number;
    log: any;
    respawncomplete: boolean;
    creepIndex: number;
    Sources: { [name: string]: SourceMemory };
    LevelTick: number[];
}


interface queData {
    memory: CreepMemory;
    body: BodyPartConstant[];
}

interface RoomMemory {
    sourcesUsed: string[];
    startSpawnPos: posData | null;
    EnergyNeedStruct: targetData[];
    EnergyNeed: number;
    ExpandedLevel: number;
    //controllerStore: posData | null;
    controllerStoreID: string | null;
    controllerStoreDef: number; 
}
interface SpawnMemory {

}

interface SourceMemory {
    pos: posData;
    usedByRoom: string;
    maxUser: number;
    workPos: posData;
    container: string | null;
    AvailEnergy: number;
    nrUsers: number;
}

interface FlagMemory {

}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
