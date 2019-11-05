
interface CreepMemory {
    type: CreepConstant;//found when used from creepType
    creationRoom: string;
    currentTarget: targetData | null;
    permTarget: targetData | null;
}


interface Memory {
    uuid: number;
    log: any;
    respawncomplete: boolean;
    creepIndex: number;
    Sources: { [name: string]: SourceMemory };
    Minerals: { [name: string]: SourceMemory };
    LevelTick: number[];
}



interface RoomMemory {
    sourcesUsed: string[];
    mineralsUsed: string[];
    startSpawnPos: posData | null;
    EnergyNeedStruct: targetData[];
    EnergyNeed: number;
    ExpandedLevel: number;
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
    linkID: string | null;
    AvailEnergy: number;
    nrUsers: number;
}

interface FlagMemory {

}
