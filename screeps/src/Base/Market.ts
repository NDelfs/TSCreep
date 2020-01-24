import { PrettyPrintErr } from "../utils/PrettyPrintErr";
import { Colony } from "Colony"
import * as C from "Types/Constants";
import * as Mem from "Memory";
import { REACTION_CHAIN, IReaction, Terminal_Min_Trade } from "Types/Constants"
//import { resourceRequest } from "Base/ResourceHandler"
//@ts-ignore
import profiler from "Profiler/screeps-profiler";
interface overflowBalance {
  A: number;
  P: string;
}

interface underflowBalance {
  R: ResourceConstant;
  A: number;
  P: string;
}

interface sendTrans {

}

const MarketMemoryDef: MarketMemory = {
  buyPrices: {},
  sellPrices: {},
}

function countResources(colonies: { [name: string]: Colony }): { [name: string]: number } {
  let ret: { [name: string]: number } = {};
  for (let col in colonies) {
    let colony = colonies[col];
    let storage = colony.room.storage;
    let terminal = colony.room.terminal;
    if (storage && terminal) {
      let keys = Object.keys(storage.store)
      for (let key of keys) {
        ret[key] = (ret[key] | 0) + storage.store[key as ResourceConstant];
      }
      let tKeys = Object.keys(terminal.store);
      for (let key of tKeys) {
        ret[key] = (ret[key] | 0) + terminal.store[key as ResourceConstant];
      }
    }
  }
  return ret;
}

export const BaseMineral = ["H", "O", "U", "K", "L", "Z", "X"];

const OVERFLOW_THRESHOLD = 3000;
const OVERFLOW_INTERNALTRADE = 3000;
const OVERFLOW_EXTERNALTRADE = 50000;
const UNDERFLOW_EXTERNALTRADE = 10000;
const UNDERFLOW_THRESHOLD = 2000;
export class Market {
  colonies: { [name: string]: Colony };
  memory: MarketMemory;
  constructor(iColonies: { [name: string]: Colony }) {
    this.colonies = iColonies;
    this.memory = Mem.wrap(Memory, "MarketMem", MarketMemoryDef);
  }

  public refresh(iColonies: { [name: string]: Colony }) {
    this.colonies = iColonies;
    this.memory = Mem.wrap(Memory, "MarketMem", MarketMemoryDef);
  }

  public run(): void {
    if (Game.time % 10 != 2)
      return;
    try {
      let globalRes = countResources(this.colonies);
      let overflow: { [R: string]: overflowBalance[] } = {};
      let underflow: underflowBalance[] = [];
      let buyOrder: { [key: string]: string } = {}; //name for one of the colonies needing the resource
      for (let roomID in this.colonies) {
        let terminal = this.colonies[roomID].room.terminal;
        if (terminal == null || !terminal.my)
          continue;

        let keys = Object.keys(terminal.store) as ResourceConstant[];
        for (let key of keys) {
          let res = terminal.store[key] || 0;
          if (res > 0) {
            let usedKey = key == RESOURCE_ENERGY;//seen as used if energy
            if (!usedKey) {
              for (let lab of this.colonies[roomID].labs) {
                usedKey = usedKey || lab.memory.resource == key;
              }
              for (let ext of this.colonies[roomID].resourceExternal) {
                usedKey = usedKey || ext == key;
              }
              for (let ext of this.colonies[roomID].resourceExternalPerm) {
                usedKey = usedKey || ext == key;
              }
            }

            if (!usedKey || ((key != RESOURCE_ENERGY && res > OVERFLOW_THRESHOLD) || (key == RESOURCE_ENERGY && res > C.TERMINAL_MIN_STORAGE))) {
              //if (!usedKey)
                //console.log(roomID, "added", key, "as unused");
              //if (key == "OH")
              //  console.log(roomID, "found OH", res)
              if (overflow[key] == null)
                overflow[key] = [];
              overflow[key].push({ A: res, P: roomID });
            }
          }
        }

        if (terminal.store.energy < C.TERMINAL_HELPLIM) {
          underflow.push({ R: RESOURCE_ENERGY, A: C.TERMINAL_HELPLIM * 1.25 - terminal.store.energy, P: roomID });
        }

        let resourcesNeeded = this.colonies[roomID].resourceExternal.concat(this.colonies[roomID].resourceExternalPerm);
        for (let req of resourcesNeeded) {
          if ((globalRes[req] | 0) + Terminal_Min_Trade < UNDERFLOW_EXTERNALTRADE && REACTION_CHAIN[req].needs.length == 0) {//only bying base ingreedients
            buyOrder[req] = roomID;
            //console.log("added buy order", req, roomID, this.colonies[roomID].resourceExternal);
          }
          
          let res = terminal.store[req] || 0;
          //if (roomID == "E48N47")
          //  console.log(roomID, "need", req, res);
          if (res < UNDERFLOW_THRESHOLD) {
            underflow.push({ R: req, A: UNDERFLOW_THRESHOLD - res, P: roomID });
          }
        }
      }

      for (let under of underflow) {
        let avails = overflow[under.R] || [];
        for (let avail of avails) {
          let term = Game.rooms[avail.P].terminal;
          if (term) {
            let amount = Math.min(avail.A, under.A);          
            //if (under.P == "E48N47" && under.R == "OH") {
            //  console.log("found matching", amount, JSON.stringify(avail), JSON.stringify(under));
            //}
            if (amount >= C.Terminal_Min_Trade || (amount == avail.A && avail.A>0)) {
              avail.A -= amount;
              under.A -= amount;
              let err = term.send(under.R, amount, under.P, "Balancing resources");
              console.log("Traded", amount, under.R, "from", avail.P, "to", under.P, "with error", PrettyPrintErr(err));
            }
          }
        }
      }
      if (!this.memory.buyPrices[RESOURCE_ENERGY]) {//just create an empty one that we can write to
        this.memory.buyPrices[RESOURCE_ENERGY] = { price: 0.2, energyCompPrice: 0.2, lastPriceChange: Game.time-10000 }
      }
      if (this.memory.buyPrices[RESOURCE_ENERGY].lastPriceChange + 1000 < Game.time) {
        let energyorders = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: RESOURCE_ENERGY });
        if (energyorders.length > 0) {
          let maxV = _.max(energyorders, (a) => { return a.price });
          this.memory.buyPrices[RESOURCE_ENERGY].price = maxV.price;
          this.memory.buyPrices[RESOURCE_ENERGY].lastPriceChange = Game.time;
        }
      }
      //let orders: { [Res: string]: Order[] } = {}; 
      for (let overR in overflow) {
        if (overR == RESOURCE_ENERGY)
          continue;//we do not sell energy
        let order: Order | null = null;
        let energyCompPrice = 0;
        let avails = overflow[overR] || [];

        for (let avail of avails) {
          let term = Game.rooms[avail.P].terminal;
          if (term && avail.A > OVERFLOW_EXTERNALTRADE + C.TERMINAL_MIN_EXT_TRADE) {
            if (order == null) {
              let minPrice = 0.2;
              let orders = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: overR as ResourceConstant });
              orders = orders.filter((e) => { return e.price > 0.3 });
              if (orders.length > 0) {
                let oldTrade = this.memory.sellPrices[overR as ResourceConstant];
                if (oldTrade && oldTrade.lastPriceChange + 1000 < Game.time) {
                  minPrice = Math.min(oldTrade.energyCompPrice * 0.99, minPrice);
                  oldTrade.energyCompPrice = minPrice;
                  console.log("reduced price of", overR, "to", minPrice);
                }
                let eP = this.memory.buyPrices[RESOURCE_ENERGY].price | 0.2 / 1000;
                let maxV = _.max(orders, (a) => { return a.price - eP * Game.market.calcTransactionCost(1000, a.roomName!, term!.room.name) });
                energyCompPrice = maxV.price - eP * Game.market.calcTransactionCost(1000, maxV.roomName!, term.room.name);
                console.log("found trade order with price", maxV.price, energyCompPrice, "min price curently", minPrice);
                if (energyCompPrice >= minPrice) {
                  order = maxV;
                  console.log("found trade order", maxV.price, energyCompPrice, overR, maxV.remainingAmount);
                }
              }
            }
            if (order != null ) {
              let tradeAmount = Math.min(avail.A - OVERFLOW_EXTERNALTRADE, order.remainingAmount, term.store.energy);

              if (tradeAmount > C.Terminal_Min_Trade) {
                let err = Game.market.deal(order!.id, tradeAmount, avail.P);
                console.log("Sold", tradeAmount, overR, "from", avail.P, "at price", order!.price, energyCompPrice, "with error", PrettyPrintErr(err));
                this.memory.sellPrices[order!.resourceType] = { price: order!.price, energyCompPrice: energyCompPrice, lastPriceChange: Game.time };
                if (tradeAmount >= order.remainingAmount) {
                  console.log("trade was completly fullfiled");
                  order = null;
                }
              }
            }
          }
        }
      }
      let orders: Order[] | null = null;
      for (let req in buyOrder) {
        let term = Game.rooms[buyOrder[req]].terminal;
        if (term) {
          let orders: Order[] | null = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: req as ResourceConstant });
          orders = orders.filter(function (a) { return a.price <= 0.03 && a.remainingAmount > C.Terminal_Min_Trade });
          orders = orders.sort(function (a, b) { return a.price - b.price; });
          if (orders.length > 0) {
            let tradeAmount = Math.min(UNDERFLOW_EXTERNALTRADE - (globalRes[req] | 0), orders[0].remainingAmount, term.store.energy);
            console.log("found trade order", orders[0].price, req, orders[0].remainingAmount, tradeAmount, "last in list", _.last(orders).price);
            if (tradeAmount > C.Terminal_Min_Trade) {
              let err = Game.market.deal(orders[0].id, tradeAmount, buyOrder[req]);
              console.log("bought", tradeAmount, req, "from", buyOrder[req], "at price", orders[0].price, "with error", PrettyPrintErr(err));
              this.memory.buyPrices[orders[0].resourceType] = { price: orders[0].price, energyCompPrice: 0, lastPriceChange: Game.time };//not energy compensated
            }
          }
        }
      }
    }
    catch (e) {
      console.log("CRASH: Market failed,", e);
    }
  }



}
profiler.registerClass(Market, 'Market');
