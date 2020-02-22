import {
  App,
  updateFrame,
  createApp,
  handleMouseMove as handleMouseMoveWithApp,
  handleResize as handleResizeWithApp,
  handleKeyDown,
  handleKeyUp,
} from "./App";
import * as Glo from "./WebGL/GloContext";
import "./Stylesheets/main.css";

interface AnimationFrame {
  app: App;
  id: number;
}

const animateFrame = (
  frame: AnimationFrame,
  timestamp: DOMHighResTimeStamp
) => {
  const { app } = frame;
  try {
    updateFrame(app);
  } catch (error) {
    logError(error);
    displayError(error);
    cancelAnimationFrame(frame.id);
    return;
  }
  frame.id = requestAnimationFrame(timestamp => animateFrame(frame, timestamp));
};

const createEventHandlers = (app: App, canvas: HTMLCanvasElement) => {
  canvas.addEventListener("click", event => handleClick(event, canvas));
  document.addEventListener("keydown", event => handleKeyDown(event, app));
  document.addEventListener("keyup", event => handleKeyUp(event, app));
  document.addEventListener("pointerlockchange", event =>
    handlePointerLockChange(event, app, canvas)
  );
  document.addEventListener("pointerlockerror", event =>
    handlePointerLockError(event)
  );
  window.addEventListener("resize", event => handleResizeWithApp(event, app));
};

const displayError = (error: Error) => {
  const pageErrorArea = document.getElementById("page-error-area");
  pageErrorArea.style.display = "block";
  const pageError = document.getElementById("page-error");
  pageError.textContent = error.toString();
};

const handleClick = (event: MouseEvent, canvas: HTMLCanvasElement): any => {
  canvas.requestPointerLock();
};

const handlePointerLockChange = (
  event: Event,
  app: App,
  canvas: HTMLCanvasElement
): any => {
  if (document.pointerLockElement === canvas) {
    if (!app.handleMouseMove) {
      const handleMouseMove = (event: MouseEvent) => {
        handleMouseMoveWithApp(event, app);
      };
      document.addEventListener("mousemove", handleMouseMove, false);
      app.handleMouseMove = handleMouseMove;
    }
  } else {
    if (app.handleMouseMove) {
      document.removeEventListener("mousemove", app.handleMouseMove, false);
      app.handleMouseMove = null;
    }
  }
};

const handlePointerLockError = (event: Event): any => {
  const error = new Error("Failed to lock the pointer.");
  displayError(error);
  logError(error);
};

const logError = (error: Error) => {
  console.error(error);
};

const main = () => {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  let app: App;
  try {
    const context = Glo.createContext(canvas);
    app = createApp(context, { width: 800, height: 600 });
  } catch (error) {
    logError(error);
    displayError(error);
    return;
  }

  createEventHandlers(app, canvas);

  const frame = {
    app,
    id: 0,
  };
  frame.id = requestAnimationFrame(timestamp => animateFrame(frame, timestamp));
};

main();
