export function storePos(pos: RoomPosition): posData{
    return { roomName: pos.roomName, x: pos.x, y: pos.y };
}

export function restorePos(pos: posData): RoomPosition {
    return new RoomPosition(pos.x, pos.y, pos.roomName);
}

export function isEqualPos(pos: RoomPosition | posData, pos2: RoomPosition | posData): boolean {
    return pos.x == pos2.x && pos.y == pos2.y && pos.roomName == pos2.roomName;
}

export function inRangeTo(pos: RoomPosition, pos2: RoomPosition | posData, range:number): boolean {
    return pos.roomName == pos2.roomName && pos.getRangeTo(pos2.x, pos2.y) <= range;
}

export function isBuildable(pos: RoomPosition): number {
    const atPos = pos.look();
    const SWAMP = "swamp";
    const PLAIN = "plain";
    for (const ind in atPos) {
        switch (atPos[ind].type) {
            case LOOK_TERRAIN:
                if (!(atPos[ind].terrain == PLAIN || atPos[ind].terrain == SWAMP))
                    return 0;
                break;
            case LOOK_STRUCTURES:
                return 1;
            case LOOK_CONSTRUCTION_SITES:
                return 1;
            default:
        }
    }
    return 2;
}
