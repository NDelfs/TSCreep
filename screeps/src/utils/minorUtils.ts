import { Colony } from "Colony";


export function nrCreepInQue(colony: Colony, type: CreepConstant): number {
  let count = 0;
  for (let que of colony.creepBuildQueRef) {
    if (que.memory.type == type)
      count++;
  }
  for (let que of colony.spawns) {
    if (que.memory.currentlySpawning && que.memory.currentlySpawning.memory.type == type)
      count++
  }
  return count;
}


export function getRandomInt(max: number) {
  return Math.floor(Math.random() * Math.floor(max));
}
