// example declaration file - remove these and add your own custom typings

type CreepConstant =
    | CREEP_HARVESTER
    | CREEP_STARTER
    | CREEP_UPGRADER
    | CREEP_TRANSPORTER;

type CREEP_STARTER = 1;
type CREEP_HARVESTER = 11;
type CREEP_UPGRADER = 21;
type CREEP_TRANSPORTER = 31;

// memory extension samples
interface CreepMemory {
    role: string;
    //type: CreepConstant;
    creationRoom: string;
    deliver: boolean;//to know when delivering, extra important for starter creep
    working: boolean;
    currentTarget: string | null;
    targetType: string;
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
    EnergyNeedStruct: string[];
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
    ClaimedEnergy: number;
    AvailEnergy: number;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
