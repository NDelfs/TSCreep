import { Colony } from "Colony";


export function nrCreepInQue(colony: Colony, type: CreepConstant, id?:string): number {
  let count = 0;
  for (let que of colony.creepBuildQueRef) {
    if (que.memory.type == type && (!id || que.memory.targetQue.length == 0 || id != que.memory.targetQue[0].ID))
      count++;
  }
  for (let que of colony.spawns) {
    if (que.memory.currentlySpawning && que.memory.currentlySpawning.memory.type == type && (!id || que.memory.currentlySpawning.memory.targetQue.length == 0 || id != que.memory.currentlySpawning.memory.targetQue[0].ID))
      count++
  }
  return count;
}


export function getRandomInt(max: number) {
  return Math.floor(Math.random() * Math.floor(max));
}
