# 🌌 3D Gravity Simulator

An interactive, high-performance 3D gravity and celestial mechanics sandbox built with **React**, **TypeScript**, and **HTML5 Canvas**. This simulator lets you craft your own solar systems, launch planets, experiment with binary star systems, witness the extreme gravity of black holes with accretion disks, and ride along with any celestial body in real-time.

---

## 🚀 Live Demo & Features

### 🌟 Interactive Physics Sandbox
* **N-Body Gravity Simulation:** Uses real Newtonian physics equations to simulate continuous gravitational attraction among all spawned bodies.
* **Elastic Collisions & Mergers:** Stars, planets, and black holes collide realistically based on mass ratio, generating vibrant particle explosions.
* **Black Hole & Accretion Disks:** Spawn supermassive black holes that pull in surrounding dust particles, forming glowing accretion disks with orbital decay.
* **Orbital Path Projection:** Visualize orbits with real-time vector path tracing.

### 🎥 Immersive Camera & Controls
* **3D Perspective Camera:** Pitch, yaw, and zoom around the canvas in 3D space.
* **Camera Modes:** Lock onto the barycenter, target a specific planet, or enter **Rider Mode** to see the cosmos from the surface of your planet.
* **Interactive Spawning:** Aim and drag to launch planets with precise velocities, or spawn quick presets (Solar Systems, Binary Stars, Chaos fields).

### ⚙️ Customizable Universe Settings
* Real-time sliders to control:
  * **Gravitational Constant (G)**
  * **Simulation Speed / Time Dilation**
  * **Collision Settings (Merge vs Bounce)**
  * **Visual effects** (Trail length, Particle count, Grid alignments)

---

## 🛠️ Built With

* **React 18** - Component-based user interface.
* **TypeScript** - Strict typing for robust physical math calculations.
* **HTML5 Canvas 2D Context** - Superb rendering performance for hundreds of bodies and thousands of particles.
* **Tailwind CSS** - Modern, responsive HUD with glassmorphism panels.
* **Lucide React** - High-quality iconography.

---

## 🏁 Quick Start

Follow these steps to run the simulator locally on your machine.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 18+ recommended).

### 1. Clone the repository
```bash
git clone https://github.com/your-username/gravity-3d-sandbox.git
cd gravity-3d-sandbox
