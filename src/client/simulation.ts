import { startHouse } from './simulation/application';
void startHouse().catch(() => {
  document.querySelector('#loading')!.textContent = 'The 3D view could not start. Try a browser with WebGL enabled, or open Classic office.';
});
