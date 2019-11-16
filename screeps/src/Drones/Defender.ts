import { PrettyPrintErr } from "utils/PrettyPrintErr";

export function Defender(creep: Creep) {
    let enemy = creep.room.find(FIND_HOSTILE_CREEPS);
    if (enemy.length > 0) {
        let err = creep.attack(enemy[0]);
        //if (err == ERR_NOT_IN_RANGE)
        creep.moveTo(enemy[0]);
    }
    else {
        for (let roomID in Game.rooms) {
            let room = Game.rooms[roomID];
            if (room.controller && room.controller.my) {
                let enemy = room.find(FIND_HOSTILE_CREEPS);
                if (enemy.length > 0) {

                    let err = creep.attack(enemy[0]);
                    //if (err == ERR_NOT_IN_RANGE)
                    creep.moveTo(enemy[0]);
                }
            }
        }
    }

}
