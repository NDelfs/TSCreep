import { ATTACK_STRUCTURE } from "Types/TargetTypes";

export function Attacker(creep: Creep) {
  let target = creep.getTarget();
  let enemy = creep.room.find(FIND_HOSTILE_CREEPS);
  if (enemy.length > 0 && !target) {
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
  if (target && creep.inPlace) {
    if (target.type == ATTACK_STRUCTURE) {
      let obj = Game.getObjectById(target.ID) as Structure;
      creep.attack(obj);
    }
  }
}
