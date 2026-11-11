import * as THREE from 'three';

export class PlayerCamera {
  constructor(camera) {
    this.camera      = camera;
    this.yaw         = 0;
    this.pitch       = 0;
    this.sensitivity = 0.002;
    this._bobTime    = 0;
    this._bobAmount  = 0.035;
    this._bobSpeed   = 9;
    this._baseY      = 0;
  }

  applyMouseDelta(dx, dy) {
    this.yaw   -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch  = Math.max(-Math.PI / 2.4, Math.min(Math.PI / 2.4, this.pitch));
  }

  update(delta, isMoving) {
    if (isMoving) {
      this._bobTime += delta * this._bobSpeed;
      const bobY = Math.sin(this._bobTime) * this._bobAmount;
      const bobX = Math.cos(this._bobTime / 2) * this._bobAmount * 0.4;
      this.camera.position.y = THREE.MathUtils.lerp(
        this.camera.position.y, this._baseY + bobY, delta * 10
      );
      this.camera.position.x = THREE.MathUtils.lerp(
        this.camera.position.x, bobX, delta * 10
      );
    } else {
      this._bobTime = 0;
      this.camera.position.y = THREE.MathUtils.lerp(
        this.camera.position.y, this._baseY, delta * 8
      );
      this.camera.position.x = THREE.MathUtils.lerp(
        this.camera.position.x, 0, delta * 8
      );
    }

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.x = this.pitch;
  }

  setBaseY(y) {
    this._baseY = y;
    this.camera.position.y = y;
  }
}
