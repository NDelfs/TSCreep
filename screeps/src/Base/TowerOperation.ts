import { PrettyPrintErr } from "../utils/PrettyPrintErr";

export function TowerOperation() {
    for (var roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        if (!room.my)
            continue;
        let towers: StructureTower[] = _.filter(room.myStructures, { structureType: STRUCTURE_TOWER } ) as StructureTower[];
        if (towers.length > 0) {
            for (let [ind, tower] of Object.entries(towers)) {
                //var hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
                if (room.hostiles.length>0) {
                    tower.attack(room.hostiles[0]);
                }
                else if (room.repairSites && room.repairSites.length > 0 && tower.energy > tower.energyCapacity * 0.5) {
                    let struct = Game.getObjectById(room.repairSites[0]) as Structure;
                    tower.repair(struct);
                    if (struct.hits > struct.hitsMax - 100 || room.controller && (struct.hits >= room.controller.level * 100000))
                        room.repairSites.shift();
                }
            }
        }
    }
}

