interface Room {
    my: boolean;
    creepsInRoom: Creep[];
    creeps: { [creepType: number]: Creep[] };
    creepsAll: Creep[];
    constructionSites: ConstructionSite[];
    drops: { [resourceType: string]: Resource[] };
    droppedEnergy: Resource[];
}


interface Creep {
    creationRoom: string;
    type: CreepConstant;
}