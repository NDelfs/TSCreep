import { goToTarget } from "Drones/Funcs/Walk";
import { PrettyPrintErr } from "utils/PrettyPrintErr";

export function Upgrader(creep: Creep) {
    if (goToTarget(creep) && creep.room.controller) {
        let err = creep.upgradeController(creep.room.controller);
        //if(err != OK)
          //console.log("upgrader err", PrettyPrintErr(err));
    }
    if (creep.carry.energy < 20 && creep.room.memory.controllerStoreID) {
        let store: StructureContainer = Game.getObjectById(creep.room.memory.controllerStoreID) as StructureContainer;
        creep.withdraw(store, RESOURCE_ENERGY);
    }
}
