import React, { useState, useEffect, useRef, useCallback } from "react";
import "./styles.css";

const WIDTH = 80;
const HEIGHT = 44;
const K1 = 40;
const INCREMENT_SPEED = 0.6;

const DEFAULT_SETTINGS = {
  DISTANCE_FROM_CAM: 27,
  ROTATION_SPEED: 0.5,
  CUBE_SIZE: 7,
  CUBE_DENSITY: 0.6,
  ROTATION_MODE: "normal",
};

const App = () => {
  const [settings, setSettings] = useState({
    distanceFromCamera: DEFAULT_SETTINGS.DISTANCE_FROM_CAM,
    rotationSpeed: DEFAULT_SETTINGS.ROTATION_SPEED,
    cubeSize: DEFAULT_SETTINGS.CUBE_SIZE,
    cubeDensity: DEFAULT_SETTINGS.CUBE_DENSITY,
    rotationMode: DEFAULT_SETTINGS.ROTATION_MODE,
  });
  const [cubeText, setCubeText] = useState("");
  const animationRef = useRef();
  const anglesRef = useRef({ A: 0, B: 0, C: 0 });

  const calculateCoordinates = useCallback((i, j, k) => {
    const { A, B, C } = anglesRef.current;
    const sinA = Math.sin(A),
      cosA = Math.cos(A);
    const sinB = Math.sin(B),
      cosB = Math.cos(B);
    const sinC = Math.sin(C),
      cosC = Math.cos(C);

    return {
      x:
        j * sinA * sinB * cosC -
        k * cosA * sinB * cosC +
        j * cosA * sinC +
        k * sinA * sinC +
        i * cosB * cosC,
      y:
        j * cosA * cosC +
        k * sinA * cosC -
        j * sinA * sinB * sinC +
        k * cosA * sinB * sinC -
        i * cosB * sinC,
      z: k * cosA * cosB - j * sinA * cosB + i * sinB,
    };
  }, []);

  const calculateDiagonalRotation = useCallback((i, j, k, size) => {
    const { A } = anglesRef.current;
    const sinA = Math.sin(A),
      cosA = Math.cos(A);
    const factor = 1 / Math.sqrt(3);

    // Rotation matrix for diagonal axis rotation
    const rotationMatrix = [
      [
        cosA + (1 - cosA) / 3,
        (1 - cosA) / 3 - factor * sinA,
        (1 - cosA) / 3 + factor * sinA,
      ],
      [
        (1 - cosA) / 3 + factor * sinA,
        cosA + (1 - cosA) / 3,
        (1 - cosA) / 3 - factor * sinA,
      ],
      [
        (1 - cosA) / 3 - factor * sinA,
        (1 - cosA) / 3 + factor * sinA,
        cosA + (1 - cosA) / 3,
      ],
    ];

    // Apply rotation and scale
    const x =
      (rotationMatrix[0][0] * i +
        rotationMatrix[0][1] * j +
        rotationMatrix[0][2] * k) *
      size;
    const y =
      (rotationMatrix[1][0] * i +
        rotationMatrix[1][1] * j +
        rotationMatrix[1][2] * k) *
      size;
    const z =
      (rotationMatrix[2][0] * i +
        rotationMatrix[2][1] * j +
        rotationMatrix[2][2] * k) *
      size;

    return { x, y, z };
  }, []);

  const calculateForSurface = useCallback(
    (cubeX, cubeY, cubeZ, ch, buffer) => {
      const { distanceFromCamera, rotationMode, cubeSize } = settings;
      let coords;

      if (rotationMode === "diagonal") {
        coords = calculateDiagonalRotation(
          cubeX / cubeSize,
          cubeY / cubeSize,
          cubeZ / cubeSize,
          cubeSize
        );
      } else {
        coords = calculateCoordinates(cubeX, cubeY, cubeZ);
      }

      coords.z += distanceFromCamera;

      const ooz = 1 / coords.z;
      const xp = Math.floor(WIDTH / 2 + K1 * ooz * coords.x * 2);
      const yp = Math.floor(HEIGHT / 2 + K1 * ooz * coords.y);

      if (xp >= 0 && xp < WIDTH && yp >= 0 && yp < HEIGHT) {
        const idx = xp + yp * WIDTH;
        if (ooz > buffer.zBuffer[idx]) {
          buffer.zBuffer[idx] = ooz;
          buffer.output[idx] = ch;
        }
      }
    },
    [settings, calculateCoordinates, calculateDiagonalRotation]
  );

  const renderCube = useCallback(() => {
    const buffer = {
      output: new Array(WIDTH * HEIGHT).fill(" "),
      zBuffer: new Array(WIDTH * HEIGHT).fill(0),
    };
    const { cubeSize, cubeDensity } = settings;

    const renderPoint = (x, y, z, ch) => {
      calculateForSurface(x * cubeSize, y * cubeSize, z * cubeSize, ch, buffer);
    };

    // Render cube edges
    for (let i = -1; i <= 1; i += 2) {
      for (let j = -1; j <= 1; j += 2) {
        for (let k = -1; k <= 1; k += 2) {
          renderPoint(i, j, k, "+");
        }
      }
    }

    // Render cube faces with density control
    for (let i = -1; i <= 1; i += cubeDensity) {
      for (let j = -1; j <= 1; j += cubeDensity) {
        renderPoint(i, j, -1, "@"); // Front face
        renderPoint(i, j, 1, "#"); // Back face
        renderPoint(-1, i, j, "~"); // Left face
        renderPoint(1, i, j, "$"); // Right face
        renderPoint(i, -1, j, ";"); // Bottom face
        renderPoint(i, 1, j, "+"); // Top face
      }
    }

    return buffer.output.reduce((acc, char, i) => {
      if (i % WIDTH === 0 && i !== 0) acc += "\n";
      return acc + char;
    }, "");
  }, [settings, calculateForSurface]);

  const rotationAlgorithms = {
    normal: (speed) => {
      anglesRef.current.A += 0.01 * speed;
      anglesRef.current.B += 0.01 * speed;
      anglesRef.current.C += 0.02 * speed;
    },
    wobble: (speed) => {
      const t = Date.now() * 0.002 * speed;
      anglesRef.current.A = Math.sin(t * 4) * 0.3;
      anglesRef.current.B = Math.cos(t * 2.8) * 0.3;
      anglesRef.current.C = Math.sin(t * 2) * 0.3;
    },
    spiral: (speed) => {
      const t = Date.now() * 0.0001;
      const spiralSpeed = 0.05 * speed;
      anglesRef.current.A += spiralSpeed * Math.sin(t);
      anglesRef.current.B += spiralSpeed * Math.cos(t);
      anglesRef.current.C += 0.001 * speed;
    },
    chaos: (speed) => {
      anglesRef.current.A += (Math.random() - 0.5) * 0.2 * speed;
      anglesRef.current.B += (Math.random() - 0.5) * 0.2 * speed;
      anglesRef.current.C += (Math.random() - 0.5) * 0.2 * speed;
    },
    diagonal: (speed) => {
      anglesRef.current.A += 0.01 * speed;
    },
  };

  const animate = useCallback(() => {
    const { rotationMode, rotationSpeed } = settings;
    rotationAlgorithms[rotationMode](rotationSpeed);
    setCubeText(renderCube());
    animationRef.current = requestAnimationFrame(animate);
  }, [settings, renderCube]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animate]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div className="cubeWrapper">
        <pre className="cube">{cubeText}</pre>
      </div>
      <div className="controls">
        {[
          {
            label: "Rotation Speed",
            key: "rotationSpeed",
            min: 0.1,
            max: 5,
            step: 0.1,
          },
          { label: "Cube Size", key: "cubeSize", min: 5, max: 30, step: 1 },
          {
            label: "Distance from camera",
            key: "distanceFromCamera",
            min: 5,
            max: 200,
            step: 1,
          },
          {
            label: "Cube Density",
            key: "cubeDensity",
            min: 0.1,
            max: 1,
            step: 0.1,
          },
        ].map(({ label, key, min, max, step }) => (
          <label key={key}>
            {label}
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              onChange={(e) => updateSetting(key, parseFloat(e.target.value))}
            />
            <span className="value-display">
              {settings[key].toFixed(
                key === "rotationSpeed" || key === "cubeDensity" ? 1 : 0
              )}
            </span>
          </label>
        ))}
        <div className="rotation-mode">
          <span>Rotation Mode:</span>
          {Object.keys(rotationAlgorithms).map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                value={mode}
                checked={settings.rotationMode === mode}
                onChange={() => updateSetting("rotationMode", mode)}
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
