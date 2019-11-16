interface getCreepsType {
    (creepType: CreepConstant): Creep[];
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
    availEnergy: number;
    controllerStoreDef: number;
}

interface Creep {
    creationRoom: string;
    type: CreepConstant;
    carryAmount: number;
    currentTarget: targetData | null;
    inPlace: boolean;
    walk: () => void;
    walkTo: (pos: posData, rang: number) => void;
    walkToPos: (x: number, y: number, room: string, rang: number) => void;
    setTarget: (id: string, type: TargetConstant, pos: posData, rang: number) => void;
    setTargetData: (iData: targetData) => void;
    _walk: boolean;
}
