import { App, updateFrame, createApp } from "./App";
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

const displayError = (error: Error) => {
  const pageErrorArea = document.getElementById("page-error-area");
  pageErrorArea.style.display = "block";
  const pageError = document.getElementById("page-error");
  pageError.textContent = error.toString();
};

const logError = (error: Error) => {
  console.error(error);
};

const main = () => {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  let app: App;
  try {
    const context = Glo.createContext(canvas);
    app = createApp(context);
  } catch (error) {
    logError(error);
    displayError(error);
    return;
  }

  const frame = {
    app,
    id: 0,
  };
  frame.id = requestAnimationFrame(timestamp => animateFrame(frame, timestamp));
};

main();
