export function storePos(pos: RoomPosition): posData{
    return { roomName: pos.roomName, x: pos.x, y: pos.y };
}

export function restorePos(pos: posData): RoomPosition {
    return new RoomPosition(pos.x, pos.y, pos.roomName);
}
