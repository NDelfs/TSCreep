export function Harvester(creep: Creep): void {
    let source: Source | null = Game.getObjectById(creep.memory.mainTarget);
    if (source) {
        let harvestErr = creep.harvest(source);
        if (harvestErr == ERR_NOT_IN_RANGE) {
            creep.moveTo(source.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        //if (creep.carry[RESOURCE_ENERGY] > 40)
        creep.drop(RESOURCE_ENERGY);
    }
}
