import { restorePos, inRangeTo } from "../utils/posHelpers";
import { DEFENDER, Military, TRANSPORTER } from "../Types/CreepType";
import { POWERUSER } from "../Types/TargetTypes";
import {PM} from "PishiMaster";

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

//Object.defineProperty(Creep.prototype, 'Colony', {
//    get() {
//        return PM.colonies[this.creationRoom];
//    },
//    configurable: true,
//});

Object.defineProperty(Creep.prototype, 'carryAmount', {
    get() {
        if (!this._carryAmount) {
            this._carryAmount = _.sum(this.carry);
        }
        return this._carryAmount;
    },
     configurable: true,
});

Object.defineProperty(Creep.prototype, 'currentTarget', {
    get() {
        if(this.memory.targetQue.length > 0)
            return this.memory.targetQue[0];
        return null;
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
    if (this.room.controller && this.room.controller.level<3&& this.room.hostiles.length > 0 && !Military.includes(this.type)) {
        let enemy = this.pos.findInRange(FIND_HOSTILE_CREEPS, 10);
        if (enemy.length>0) {
            let goals = _.map(enemy, function (enemy) {
                return { pos: enemy.pos, range: 10 };
            });
            let path = PathFinder.search(this.pos, goals, { flee: true }).path;
            if (this.currentTarget)
                this.memory.moveTarget = { pos: this.currentTarget.pos, range: this.currentTarget.range };
            this.moveByPath(path);
            this._walk = true;
            return;
        }
    }

    if (this.memory.moveTarget) {
        
        if (!inRangeTo(this.pos, this.memory.moveTarget.pos, this.memory.moveTarget.range)) {
            const workPos = restorePos(this.memory.moveTarget.pos);
            if (this.room.name != this.memory.moveTarget.pos.roomName)
                this.moveTo(workPos, { reusePath: 40 });
            else
              this.moveTo(workPos);
            this._walk = true;
        }

        if (inRangeTo(this.pos, this.memory.moveTarget.pos, this.memory.moveTarget.range))
            this.memory.moveTarget = null;       
    }
}

Creep.prototype.walkTo = function (pos: posData, rang: number): void {
    if (!inRangeTo(this.pos, pos,rang))
      this.memory.moveTarget = { pos: pos, range: rang };
};
Creep.prototype.walkToPos = function (x: number, y: number, room: string, rang: number) {
    if (!inRangeTo(this.pos, {x:x,y:y,roomName:room}, rang))
      this.memory.moveTarget = {
        pos: { x: x, y: y, roomName: room }, range: rang
    }
}

Creep.prototype.addTarget = function (id: string, type: TargetConstant, pos: posData, rang: number) {
    this.addTargetT({ ID: id, type: type, pos: pos, range: rang });
}

Creep.prototype.addTargetT = function (iTarget: targetData) {
    this.memory.targetQue.push(iTarget);
    if (this.memory.targetQue.length == 1) {//special case to init when beeing lazy before
        this.walkTo(this.memory.targetQue[0].pos, this.memory.targetQue[0].range)
    }
}

Creep.prototype.completeTarget = function (): void {
    this.memory.targetQue.shift();
    if (this.memory.targetQue.length > 0) {
        this.walkTo(this.memory.targetQue[0].pos, this.memory.targetQue[0].range)
    }
}
