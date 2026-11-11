import EventBus from '../core/EventBus.js';

export class PeerConnection {
  constructor(conn, peerId) {
    this.conn   = conn;
    this.peerId = peerId;
    this.ready  = false;
    this._bind();
  }

  _bind() {
    this.conn.on('open',  ()    => { this.ready = true;  EventBus.emit('peer:open',  { peerId: this.peerId }); });
    this.conn.on('close', ()    => { this.ready = false; EventBus.emit('peer:close', { peerId: this.peerId }); });
    this.conn.on('error', (err) => { EventBus.emit('peer:error', { peerId: this.peerId, err }); });
    this.conn.on('data',  (raw) => {
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        EventBus.emit('peer:message', { peerId: this.peerId, msg });
      } catch (e) {
        console.warn('[PeerConn] Bad message from', this.peerId, e);
      }
    });
  }

  send(type, payload = {}) {
    if (!this.ready) return false;
    try {
      this.conn.send(JSON.stringify({ type, payload, ts: Date.now() }));
      return true;
    } catch (e) {
      console.warn('[PeerConn] Send failed:', e);
      return false;
    }
  }

  close() {
    this.conn.close();
  }
}
