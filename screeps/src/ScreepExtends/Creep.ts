import { restorePos } from "../utils/posHelpers";

Object.defineProperty(Creep.prototype, 'type', {
    get() {
        return this.memory.type;
    },
    configurable: true,
});

Object.defineProperty(Creep.prototype, 'creationRoom', {
    get() {
        return this.memory.creationRoom;
    },
    configurable: true,
});

Object.defineProperty(Creep.prototype, 'carryAmount', {
    get() {
        if (!this._carryAmount) {
            this._carryAmount = _.sum(this.carry);
        }
        return this._carryAmount;
    },
     configurable: true,
});

Object.defineProperty(Creep.prototype, 'inPlace', {
    get() {
        return this.memory.moveTarget == null;
    },
    configurable: true,
});

Creep.prototype.walk = function () {
    if (this._walk) {
        return;
    }
    
    if (this.memory.moveTarget) {
        const workPos = restorePos(this.memory.moveTarget.pos);
        if (this.pos.roomName != this.memory.moveTarget.pos.roomName || this.pos.getRangeTo(workPos.x, workPos.y) > this.memory.moveTarget.range) {
            this.moveTo(workPos);
            this._walk = true;
        }
        
        if (this.pos.roomName == this.memory.moveTarget.pos.roomName && this.pos.getRangeTo(workPos.x, workPos.y) <= this.memory.moveTarget.range)
            this.memory.moveTarget = null;       
    }
}

Creep.prototype.walkTo = function (pos: RoomPosition, rang: number): void {
    this.memory.moveTarget = { pos: pos, range: rang };
};
Creep.prototype.walkToPos = function (x: number, y: number, room: string, rang: number) {
    this.memory.moveTarget = {
        pos: { x: x, y: y, roomName: room }, range: rang
    }
}

