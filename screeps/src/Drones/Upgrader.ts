import { PrettyPrintErr } from "utils/PrettyPrintErr";
import { PM } from "PishiMaster";
import { Colony } from "Colony"

export function Upgrader(creep: Creep) {
  if (creep.inPlace && creep.room.controller) {
    let err = creep.upgradeController(creep.room.controller);
    let colony = PM.colonies[creep.memory.creationRoom];
    if (creep.carry.energy < 20) {
      if (colony.controllerLink && colony.controllerLink.energy >= creep.carryCapacity) {
        creep.withdraw(colony.controllerLink, RESOURCE_ENERGY);
      }
      else if (colony.controllerContainer) {
        creep.withdraw(colony.controllerContainer, RESOURCE_ENERGY);
      }
      else
        creep.say('error');
    }
    
  }
}
