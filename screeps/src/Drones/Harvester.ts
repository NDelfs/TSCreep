import * as targetT from "Types/TargetTypes";


export function Harvester(creep: Creep): void {
    //if (creep.room.name == "E48N47")
    //console.log("in place ", creep.inPlace, creep.currentTarget)
    let target = creep.getTarget();
    if (creep.inPlace && target) {      
        let source = Game.getObjectById(target.ID) as Source | Mineral;
        const resMem = Memory.Resources[target.ID];
        if (resMem.resourceType != RESOURCE_ENERGY) {
            let extractor = source.pos.lookFor(LOOK_STRUCTURES) as StructureExtractor[];
            if (extractor[0].cooldown) {
                creep.say("Wait");
                return;
            }
        }     
        creep.harvest(source);
        creep.say("Mine");
        if (creep.carryCapacity != 0 && creep.carryAmount > creep.carryCapacity * 0.8) {
            for (const resourceType in creep.carry) {
                creep.drop(resourceType as ResourceConstant);
            }
        }
    }
}
