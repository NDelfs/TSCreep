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
    repairSites: string[];
    drops: { [resourceType: string]: Resource[] };
    droppedEnergy: Resource[];
    availEnergy: number;
    controllerStoreDef: number;
}

interface Creep {
    creationRoom: string;
    type: CreepConstant;
    carryAmount: number;
    inPlace: bool;
    walk: () => void;
    walkTo: (pos: RoomPosition, rang: number) => void;
    walkToPos: (x: number, y: number, room: string, rang: number) => void;

    _walk: boolean;
}
