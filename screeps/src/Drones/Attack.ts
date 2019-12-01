import * as targetT from "Types/TargetTypes";

export function Attacker(creep: Creep) {
    if (creep.getTarget() == null && creep.inPlace) {
        let attackFlag = _.filter(Game.flags, function (flag) { return flag.color == COLOR_BLUE });
        if (attackFlag.length > 0 && attackFlag[0].pos.roomName != creep.pos.roomName) {
            creep.walkTo(attackFlag[0].pos, 5);
        }
        if (attackFlag.length > 0 && attackFlag[0].pos.roomName == creep.pos.roomName && creep.room.controller)//we may not see room before the attacking creep is there
            creep.addTarget(creep.room.controller.id, targetT.DEFEND, creep.room.controller.pos, 1);
    }
    else
      creep.walk();

    let spawns = creep.room.find(FIND_HOSTILE_SPAWNS);
    if (spawns.length > 0) {
        creep.attack(spawns[0]);
        creep.moveTo(spawns[0]);
        
    }

    
    let enemy = creep.room.find(FIND_HOSTILE_CREEPS);
    if (enemy.length > 0 && spawns.length == 0) {
        let err = creep.attack(enemy[0]);
        //if (err == ERR_NOT_IN_RANGE)
        creep.moveTo(enemy[0]);
    }
    if (enemy.length > 0) {
        for (let enCre of enemy) {
            let dist = creep.pos.getRangeTo(enCre.pos.x, enCre.pos.y);
            if (dist < 4)
                creep.rangedAttack(enCre);
            if (dist == 1)
                creep.attack(enCre);
        }
    }
    else if (spawns.length == 0) {
        let stru = creep.room.find(FIND_STRUCTURES, {
            filter: function (str) {
                return (str.structureType == STRUCTURE_EXTENSION ||
                    str.structureType == STRUCTURE_TOWER)
            }
        });//
        if (stru.length > 0) {
            creep.attack(stru[0]);
            creep.moveTo(stru[0]);

        }
    }
}
