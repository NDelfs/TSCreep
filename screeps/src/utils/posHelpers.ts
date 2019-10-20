export function storePos(pos: RoomPosition): posData{
    return { roomName: pos.roomName, x: pos.x, y: pos.y };
}

export function restorePos(pos: posData): RoomPosition {
    return new RoomPosition(pos.x, pos.y, pos.roomName);
}

export function isEqualPos(pos: RoomPosition | posData, pos2: RoomPosition | posData): boolean {
    return pos.x == pos2.x && pos.y == pos2.y && pos.roomName == pos2.roomName;
}
