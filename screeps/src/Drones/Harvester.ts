import * as targetT from "Types/TargetTypes";
import { goToTarget } from "Drones/Funcs/Walk";


export function Harvester(creep: Creep): void {
    if (creep.inPlace && creep.memory.currentTarget) {      
        let source = Game.getObjectById(creep.memory.currentTarget.ID) as Source | Mineral;
        const resMem = Memory.Resources[creep.memory.currentTarget.ID];
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
