// Retargetable spring: position and velocity remain continuous when interrupted.
export const reducedMotion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;
export function spring(update, initial = 0) {
  let position = initial,
    velocity = 0,
    target = initial,
    frame = 0,
    last = 0,
    onRest = () => {};
  function step(now) {
    const dt = Math.min((now - last) / 1000 || 1 / 60, 1 / 32);
    last = now;
    const stiffness = 380,
      damping = 39;
    velocity += (stiffness * (target - position) - damping * velocity) * dt;
    position += velocity * dt;
    update(position);
    if (Math.abs(velocity) < 0.08 && Math.abs(position - target) < 0.08) {
      position = target;
      velocity = 0;
      frame = 0;
      update(position);
      onRest();
    } else frame = requestAnimationFrame(step);
  }
  return {
    to(value, releaseVelocity, rest = () => {}) {
      target = value;
      onRest = rest;
      if (releaseVelocity !== undefined) velocity = releaseVelocity;
      if (reducedMotion()) {
        cancelAnimationFrame(frame);
        frame = 0;
        position = target;
        velocity = 0;
        update(position);
        rest();
        return;
      }
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    },
    grab() {
      cancelAnimationFrame(frame);
      frame = 0;
      return position;
    },
    set(value) {
      position = value;
      update(position);
    },
    get value() {
      return position;
    },
  };
}
export function setupSheet(dialog) {
  const handle = dialog.querySelector('.sheet-handle');
  let closing = false;
  const motion = spring((y) => {
    dialog.style.transform = `translateY(${y}px)`;
    dialog.style.opacity = String(
      Math.max(0.3, 1 - (y / (dialog.offsetHeight || 1)) * 0.4),
    );
  });
  const close = () => {
    closing = true;
    motion.to(dialog.offsetHeight + 40, undefined, () => {
      if (closing) {
        dialog.close();
        dialog.style.transform = '';
        dialog.style.opacity = '';
      }
    });
  };
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientY < r.top || e.clientX < r.left || e.clientX > r.right)
        close();
    }
  });
  let start = 0,
    origin = 0,
    history = [];
  handle.addEventListener('pointerdown', (e) => {
    closing = false;
    origin = motion.grab();
    start = e.clientY;
    history = [[e.clientY, e.timeStamp]];
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!handle.hasPointerCapture(e.pointerId)) return;
    const delta = e.clientY - start + origin;
    motion.set(delta < 0 ? delta / (1 + Math.abs(delta) / 60) : delta);
    history.push([e.clientY, e.timeStamp]);
    history = history.filter((p) => e.timeStamp - p[1] < 90);
  });
  const release = (e) => {
    if (!handle.hasPointerCapture(e.pointerId)) return;
    handle.releasePointerCapture(e.pointerId);
    const first = history[0] || [e.clientY, e.timeStamp];
    const velocity =
      ((e.clientY - first[0]) / Math.max(1, e.timeStamp - first[1])) * 1000;
    const projected = motion.value + ((velocity / 1000) * 0.99) / (1 - 0.99);
    if (projected > dialog.offsetHeight * 0.32) {
      closing = true;
      motion.to(dialog.offsetHeight + 40, velocity, () => {
        if (closing) dialog.close();
      });
    } else motion.to(0, velocity);
  };
  handle.addEventListener('pointerup', release);
  handle.addEventListener('pointercancel', () => motion.to(0, 0));
  return {
    open() {
      closing = false;
      if (!dialog.open) {
        dialog.showModal();
        motion.set(Math.min(90, innerHeight * 0.12));
      }
      motion.to(0);
    },
    close,
  };
}
