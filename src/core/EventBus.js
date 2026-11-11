class _EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(fn);
  }

  off(event, fn) {
    this._handlers.get(event)?.delete(fn);
  }

  emit(event, data) {
    this._handlers.get(event)?.forEach(fn => {
      try { fn(data); } catch (e) { console.error(`[EventBus] Error in handler for "${event}":`, e); }
    });
  }

  once(event, fn) {
    const wrapper = (d) => { fn(d); this.off(event, wrapper); };
    this.on(event, wrapper);
  }
}

export const EventBus = new _EventBus();
export default EventBus;
