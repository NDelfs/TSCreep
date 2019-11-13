
interface CreepMemory {
    type: CreepConstant;//found when used from creepType
    creationRoom: string;
    currentTarget: targetData | null;
    moveTarget: moveData | null;
    permTarget: targetData | null;
}


interface Memory {
    uuid: number;
    log: any;
    respawncomplete: boolean;
    creepIndex: number;
    Resources: { [name: string]: SourceMemory };
    LevelTick: number[];
}



interface RoomMemory {
    inCreepEmergency: number | null;
    sourcesUsed: string[];
    mineralsUsed: string[];
    startSpawnPos: posData | null;
    EnergyNeedStruct: targetData[];
    EnergyNeed: number;
    ExpandedLevel: number;
    controllerStoreID: string | null;

    //used by functions
    _repairSites: string[];
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
    AvailResource: number;
    nrUsers: number;
    resourceType: ResourceConstant;
}

interface FlagMemory {

}
