import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

const WIDTH = 80;
const HEIGHT = 44;
const K1 = 40;
const DEFAULT_DISTANCE_FROM_CAM = 27;
const DEFAULT_ROTATION_SPEED = 0.5;
const DEFAULT_CUBE_SIZE = 7;
const DEFAULT_ROTATION_MODE = "normal";
const INCREMENT_SPEED = 0.6;

const App = () => {
  const [distanceFromCamera, setDistanceFromCamera] = useState(
    DEFAULT_DISTANCE_FROM_CAM
  );
  const [rotationSpeed, setRotationSpeed] = useState(DEFAULT_ROTATION_SPEED);
  const [cubeSize, setCubeSize] = useState(DEFAULT_CUBE_SIZE);
  const [rotationMode, setRotationMode] = useState(DEFAULT_ROTATION_MODE);
  const [cubeText, setCubeText] = useState("");
  const animationRef = useRef();
  const anglesRef = useRef({ A: 0, B: 0, C: 0 });

  function calculateX(i, j, k) {
    const { A, B, C } = anglesRef.current;
    return (
      j * Math.sin(A) * Math.sin(B) * Math.cos(C) -
      k * Math.cos(A) * Math.sin(B) * Math.cos(C) +
      j * Math.cos(A) * Math.sin(C) +
      k * Math.sin(A) * Math.sin(C) +
      i * Math.cos(B) * Math.cos(C)
    );
  }

  function calculateY(i, j, k) {
    const { A, B, C } = anglesRef.current;
    return (
      j * Math.cos(A) * Math.cos(C) +
      k * Math.sin(A) * Math.cos(C) -
      j * Math.sin(A) * Math.sin(B) * Math.sin(C) +
      k * Math.cos(A) * Math.sin(B) * Math.sin(C) -
      i * Math.cos(B) * Math.sin(C)
    );
  }

  function calculateZ(i, j, k) {
    const { A, B } = anglesRef.current;
    return (
      k * Math.cos(A) * Math.cos(B) -
      j * Math.sin(A) * Math.cos(B) +
      i * Math.sin(B)
    );
  }

  function calculateDiagonalRotation(i, j, k, size) {
    const { A } = anglesRef.current;
    const sinA = Math.sin(A);
    const cosA = Math.cos(A);
    const x =
      (1 / Math.sqrt(3)) *
      ((cosA + (1 - cosA) / 3) * i +
        ((1 - cosA) / 3 - (Math.sqrt(3) * sinA) / 3) * j +
        ((1 - cosA) / 3 + (Math.sqrt(3) * sinA) / 3) * k) *
      size;
    const y =
      (1 / Math.sqrt(3)) *
      (((1 - cosA) / 3 + (Math.sqrt(3) * sinA) / 3) * i +
        (cosA + (1 - cosA) / 3) * j +
        ((1 - cosA) / 3 - (Math.sqrt(3) * sinA) / 3) * k) *
      size;
    const z =
      (1 / Math.sqrt(3)) *
      (((1 - cosA) / 3 - (Math.sqrt(3) * sinA) / 3) * i +
        ((1 - cosA) / 3 + (Math.sqrt(3) * sinA) / 3) * j +
        (cosA + (1 - cosA) / 3) * k) *
      size;
    return { x, y, z };
  }

  function calculateForSurface(cubeX, cubeY, cubeZ, ch, buffer) {
    let x, y, z;

    if (rotationMode === "diagonal") {
      const coords = calculateDiagonalRotation(
        cubeX,
        cubeY,
        cubeZ,
        cubeSize / 0.5
      );
      x = coords.x;
      y = coords.y;
      z = coords.z;
    } else {
      x = calculateX(cubeX, cubeY, cubeZ);
      y = calculateY(cubeX, cubeY, cubeZ);
      z = calculateZ(cubeX, cubeY, cubeZ);
    }

    z += distanceFromCamera;
    const ooz = 1 / z;
    const xp = Math.floor(WIDTH / 2 + K1 * ooz * x * 2);
    const yp = Math.floor(HEIGHT / 2 + K1 * ooz * y);
    const idx = xp + yp * WIDTH;
    if (idx >= 0 && idx < WIDTH * HEIGHT) {
      if (ooz > buffer.zBuffer[idx]) {
        buffer.zBuffer[idx] = ooz;
        buffer.output[idx] = ch;
      }
    }
  }

  function renderCube() {
    const buffer = {
      output: new Array(WIDTH * HEIGHT).fill(" "),
      zBuffer: new Array(WIDTH * HEIGHT).fill(0)
    };
    for (let cubeX = -cubeSize; cubeX < cubeSize; cubeX += INCREMENT_SPEED) {
      for (let cubeY = -cubeSize; cubeY < cubeSize; cubeY += INCREMENT_SPEED) {
        calculateForSurface(cubeX, cubeY, -cubeSize, "@", buffer);
        calculateForSurface(cubeSize, cubeY, cubeX, "$", buffer);
        calculateForSurface(-cubeSize, cubeY, -cubeX, "~", buffer);
        calculateForSurface(-cubeX, cubeY, cubeSize, "#", buffer);
        calculateForSurface(cubeX, -cubeSize, -cubeY, ";", buffer);
        calculateForSurface(cubeX, cubeSize, cubeY, "+", buffer);
      }
    }
    return buffer.output.reduce((acc, char, i) => {
      if (i % WIDTH === 0 && i !== 0) acc += "\n";
      return acc + char;
    }, "");
  }

  const rotationAlgorithms = {
    normal: () => {
      anglesRef.current.A += 0.01 * rotationSpeed;
      anglesRef.current.B += 0.01 * rotationSpeed;
      anglesRef.current.C += 0.02 * rotationSpeed;
    },
    wobble: () => {
      const t = Date.now() * 0.002 * rotationSpeed;
      anglesRef.current.A = Math.sin(t * 4) * 0.3;
      anglesRef.current.B = Math.cos(t * 2.8) * 0.3;
      anglesRef.current.C = Math.sin(t * 2) * 0.3;
    },
    spiral: () => {
      const t = Date.now() * 0.0001;
      const spiralSpeed = 0.05 * rotationSpeed;
      anglesRef.current.A += spiralSpeed * Math.sin(t);
      anglesRef.current.B += spiralSpeed * Math.cos(t);
      anglesRef.current.C += 0.001 * rotationSpeed;
    },
    chaos: () => {
      anglesRef.current.A += (Math.random() - 0.5) * 0.2 * rotationSpeed;
      anglesRef.current.B += (Math.random() - 0.5) * 0.2 * rotationSpeed;
      anglesRef.current.C += (Math.random() - 0.5) * 0.2 * rotationSpeed;
    },
    diagonal: () => {
      anglesRef.current.A += 0.01 * rotationSpeed; // Rotate along diagonal axis
    }
  };

  const animate = () => {
    rotationAlgorithms[rotationMode]();
    setCubeText(renderCube());
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [rotationMode, rotationSpeed, cubeSize, distanceFromCamera]);

  return (
    <>
      <div className="cubeWrapper">
        <pre className="cube">{cubeText}</pre>
      </div>
      <div className="controls">
        <label>
          Rotation Speed
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
          />
          <span className="value-display">{rotationSpeed.toFixed(1)}</span>
        </label>
        <label>
          Cube Size
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={cubeSize}
            onChange={(e) => setCubeSize(parseInt(e.target.value))}
          />
          <span className="value-display">{cubeSize}</span>
        </label>
        <label>
          Dinstance from camera
          <input
            type="range"
            min="5"
            max="200"
            step="1"
            value={distanceFromCamera}
            onChange={(e) => setDistanceFromCamera(parseInt(e.target.value))}
          />
          <span className="value-display">{distanceFromCamera}</span>
        </label>
        <div className="rotation-mode">
          <span>Rotation Mode:</span>
          {Object.keys(rotationAlgorithms).map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                value={mode}
                checked={rotationMode === mode}
                onChange={() => setRotationMode(mode)}
              />
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </label>
          ))}
        </div>
      </div>
    </>
  );
};

export default App;
