import { goToTarget } from "Drones/Funcs/Walk";
import { PrettyPrintErr } from "utils/PrettyPrintErr";

export function Upgrader(creep: Creep) {
    if (creep.inPlace() && creep.room.controller) {
        let err = creep.upgradeController(creep.room.controller);
    }
    if (creep.carry.energy < 20 && creep.room.memory.controllerStoreID) {
        let store: StructureContainer = Game.getObjectById(creep.room.memory.controllerStoreID) as StructureContainer;
        creep.withdraw(store, RESOURCE_ENERGY);
    }
}
