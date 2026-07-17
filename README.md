# 🌌 Orbit Simulator

An elegant, high-performance 3D gravity and celestial mechanics sandbox built with **React**, **TypeScript**, and **HTML5 Canvas**. The application utilizes Newtonian physics to simulate real-time gravitational attraction, allowing you to build solar systems, orchestrate binary star dances, spawn supermassive black holes, and track telemetry in a premium, professional monochrome mission-control interface.

---

## 🛰️ Project Overview

Orbit Simulator is a space sandbox designed to make complex orbital mechanics visual and interactive. By utilizing a optimized N-body integration loop, it models continuous gravitational interactions between celestial bodies of varying masses.

### Design Ideology
The user interface is designed to "disappear." The UI stays almost completely monochrome, using color **only** when it communicates physical meaning (e.g. warm gold for stars, orange for collisions, red for errors, emerald for success). It is inspired by professional desktop programs like Apple Pro Apps, Space Engine, and NASA/JPL mission control.

### Technologies Used
- **Vite & React** — Lightweight structure and UI components
- **TypeScript** — Strict mathematical typing
- **HTML5 Canvas** — High-performance 2D/3D projection rendering
- **Design Tokens** — Centralized variables for colors, typography, borders, shadows, and animations (`src/theme/tokens.ts`)
- **Lucide React** — Premium UI iconography

---

## 🌟 Features

- **N-Body Gravitational Simulation**: True physics modeling of gravity between stars, planets, and black holes.
- **Visual Collision Modes**: Choose between *Merge* (conservation of momentum where bodies absorb one another) or *Bounce* (elastic physical recoil).
- **Scenario Presets**: Instantly load preset cosmic configurations:
  - *Solar Oasis*: A stable star orbited by multiple planets and a dense asteroid belt.
  - *Binary Dance*: A chaotic, beautiful orbit of two equal-mass stars.
  - *Galactic Fusion*: Two colliding spiral galaxies composed of hundreds of space dust particles.
  - *Event Horizon*: A doomed system centered around a supermassive black hole with an accretion disk.
- **Slingshot Spawner**: Click and drag on the canvas to visually set the launch trajectory and velocity of new bodies.
- **Event Console**: A styled, real-time telemetry log displaying collisions, merges, orbits, and spawns, color-coded and animated.
- **Inspector Panel**: Click on any active body to customize its name and mass, review coordinates in a structured table, or sync orbital velocities.
- **Auto Orbit**: Dynamically calculates stable circular orbit velocities relative to the heaviest local attractor during spawns.
- **Adjustable Physics parameters**: Modify the Gravitational Constant ($G$) and Temporal Time-Scale in real-time.
- **Responsive Mission Control UI**: 
  - **VisionOS Glassmorphism**: Translucent floating panels (`0.35` opacity, `40px` blur, and deep shadows) replicate a native desktop app feel.
  - **Fluid Micro-Interactions**: Custom hardware-accelerated animations (`animate-sidebar-in`, interactive hover button lifts, selection glow pulses) enrich interaction without overwhelming the UI.
  - **Adaptive Viewport**: The layout intelligently adjusts for all displays (from 3440px Ultrawide down to 768px Tablets). Telemetry panels elegantly slide out of bounds on smaller resolutions to maximize the 3D space canvas while keeping key functionality preserved behind toggles.

---

## 🏁 Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) installed (version 18+).

### 1. Clone the Repository
```bash
git clone https://github.com/codewithabhiishek/orbit-simulator-3d.git
cd orbit-simulator-3d
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

The application will be served at **http://localhost:3000/**.
