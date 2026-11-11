import EventBus from '../core/EventBus.js';

export class Inventory {
  constructor(maxSlots = 4) {
    this.maxSlots   = maxSlots;
    this.slots      = new Array(maxSlots).fill(null);
    this.activeSlot = 0;
  }

  get activeItem() {
    return this.slots[this.activeSlot];
  }

  addItem(itemDef) {
    const freeSlot = this.slots.indexOf(null);
    if (freeSlot === -1) return false;
    this.slots[freeSlot] = itemDef;
    this._emit();
    return true;
  }

  removeItem(slotIndex) {
    const item = this.slots[slotIndex];
    this.slots[slotIndex] = null;
    this._emit();
    return item;
  }

  dropActive() {
    return this.removeItem(this.activeSlot);
  }

  switchSlot(index) {
    if (index < 0 || index >= this.maxSlots) return;
    this.activeSlot = index;
    this._emit();
  }

  useActive() {
    const item = this.activeItem;
    if (!item) return;
    if (item.onUse) item.onUse(item);
    if (item.consumable) this.removeItem(this.activeSlot);
  }

  _emit() {
    EventBus.emit('inventoryChange', {
      slots:       this.slots,
      activeSlot:  this.activeSlot
    });
  }
}
