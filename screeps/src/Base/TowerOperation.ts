import { PrettyPrintErr } from "../utils/PrettyPrintErr";

export function TowerOperation() {
    for (var roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        let towers: StructureTower[] = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } }) as StructureTower[];

        if (towers.length > 0) {
            let hostile = room.find(FIND_HOSTILE_CREEPS)[0];

            for (let [ind, tower] of Object.entries(towers)) {
                //var hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)

                if (hostile) {
                    tower.attack(hostile);
                }

                else if (room.memory.repairQue && room.memory.repairQue.length > 0 && tower.energy > tower.energyCapacity * 0.5) {
                    let struct = Game.getObjectById(room.memory.repairQue[0]) as Structure;
                    tower.repair(struct);
                    if (struct.hits > struct.hitsMax - 100 || room.controller && (struct.hits >= room.controller.level * 100000))
                        room.memory.repairQue.shift();
                }
            }
        }
    }
}

