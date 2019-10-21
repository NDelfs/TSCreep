// example declaration file - remove these and add your own custom typings
// memory extension samples
type TargetConstant =
    | CONTROLLER
    | STRUCTURE
    | SOURCE
    | DROPPED_ENERGY
    | CONSTRUCTION;

type TargetEnergy =
    | SOURCE
    | DROPPED_ENERGY;

type CONTROLLER = 1;
type STRUCTURE = 11;
type SOURCE = 21;
type DROPPED_ENERGY = 31;
type CONSTRUCTION = 41;

type CreepConstant =
    | STARTER
    | HARVESTER
    | UPGRADER
    | TRANSPORTER
    | BUILDER;

type STARTER = 1;
type HARVESTER = 11;
type UPGRADER = 21;
type TRANSPORTER = 31;
type BUILDER = 41;


interface targetData {
    ID: string;
    type: TargetConstant;
    pos: posData;
    range: number;
}

interface CreepMemory {
    type: CreepConstant;//found when used from creepType
    creationRoom: string;
    currentTarget: targetData|null;
    mainTarget: string; //used by i.e harvesters. creeps not using this has ""
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

interface harvesterQueData {
    room: string;
    mainTarget: string;
}

interface queData {
    memory: CreepMemory;
    body: BodyPartConstant[];
}

interface RoomMemory {
    sourcesUsed: string[];
    starterque: harvesterQueData[];
    startSpawnPos: posData | null;
    EnergyNeedStruct: targetData[];
    EnergyNeed: number;
    energyAvail: number;
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
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
