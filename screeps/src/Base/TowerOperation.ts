import { PrettyPrintErr } from "../utils/PrettyPrintErr";

export function TowerOperation() {
    for (var roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        let towers: StructureTower[] = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } }) as StructureTower[];

        if (towers.length > 0) {
            var emergencyB = room.find(FIND_MY_STRUCTURES, {
                filter: function (struct) {
                    return struct.hits < 1000 && struct.hits < struct.hitsMax && struct.structureType != STRUCTURE_CONTROLLER;
                }
            });
            for (let [ind, tower] of Object.entries(towers)) {
                //var hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
                let hostile = tower.room.find(FIND_HOSTILE_CREEPS)[0];
                if (hostile) {
                    tower.attack(hostile);
                }
                else if (emergencyB.length > 0) {
                    const err = tower.repair(emergencyB[0]);
                    if (err)
                        console.log("Tower got error while repairing " + PrettyPrintErr(err));
                }
                else {
                    let struct = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: function (struct) {
                            return tower.room.controller && (struct.hits < tower.room.controller.level*100000) && (struct.hits < struct.hitsMax);
                        }
                    });
                    if (tower.room.energyAvailable > tower.room.energyCapacityAvailable * 0.8 && struct && tower.energy > tower.energyCapacity * 0.5) {
                        tower.repair(struct);
                    }
                }


            }

        }
    }
}
