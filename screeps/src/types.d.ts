// example declaration file - remove these and add your own custom typings
// memory extension samples
interface CreepMemory {
    type: creepT.CreepConstant;//found when used from creepType
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
