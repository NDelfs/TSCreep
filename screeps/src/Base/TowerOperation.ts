import { PrettyPrintErr } from "../utils/PrettyPrintErr";
import { Colony } from "Colony";

export function TowerOperation(towers: StructureTower[]) {
    if (towers.length > 0) {
        let room = towers[0].room;
        for (let tower of towers) {
            if (room.hostiles.length > 0) {
                tower.attack(room.hostiles[0]);
            }
            else if (global[room.name].repairSites.length > 0 && tower.energy > tower.energyCapacity * 0.5) {
                let struct = Game.getObjectById(global[room.name].repairSites[0]) as Structure;
                tower.repair(struct);
                if (struct.hits > struct.hitsMax - 100 || room.controller && (struct.hits >= room.controller.level * 100000))
                    global[room.name].repairSites.shift();
            }
        }
    }
}

