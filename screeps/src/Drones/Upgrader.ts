export function Upgrader(creep: Creep) {
    if (creep.memory.working) {
        let sources = creep.room.find(FIND_SOURCES);
        let source = sources[0];
        let harvestErr = creep.harvest(source);
        if (harvestErr == ERR_NOT_IN_RANGE) {
            creep.moveTo(source.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        else if (harvestErr == OK && creep.carry.energy == creep.carryCapacity)
            creep.memory.working = false;
    }
    else {
        let controller = creep.room.controller;
        if (controller) {
            let transfErr = creep.upgradeController(controller);
            if (transfErr == ERR_NOT_IN_RANGE) {
                creep.moveTo(controller.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            if (creep.carry.energy == 0)
                creep.memory.working = true;
        }
        else {
            console.log("Upgrader in a room without controller");
        }
    }
}
