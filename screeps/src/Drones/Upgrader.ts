import { PrettyPrintErr } from "utils/PrettyPrintErr";
import { PM } from "PishiMaster";
import { Colony } from "Colony"

export function Upgrader(creep: Creep) {
    if (creep.inPlace && creep.room.controller) {
        let err = creep.upgradeController(creep.room.controller);
        let colony = PM.colonies[creep.memory.creationRoom];
        if (creep.carry.energy < 20 && colony.memory.controllerStoreID) {
            let store: StructureContainer = Game.getObjectById(colony.memory.controllerStoreID) as StructureContainer;
            creep.withdraw(store, RESOURCE_ENERGY);
        }
    }
}
