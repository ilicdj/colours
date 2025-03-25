import * as THREE from 'three'
import Stats from 'stats.js'
import { Pane } from 'tweakpane'
import vertex from '../shaders/vertex.glsl'
import fragment from '../shaders/fragment.glsl'
import texture1 from '../images/burash01.png?url'

export default class Sketch {

  constructor(options) {
    this.scene = new THREE.Scene()
    this.secondScene = new THREE.Scene()

    this.container = options.dom
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight

    // Track mouse position
    this.mouse = new THREE.Vector2(0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0x000520, 1) // Changed to dark blue to match shader
    this.renderer.physicallyCorrectLights = true
    this.renderer.outputEncoding = THREE.sRGBEncoding

    this.container.appendChild(this.renderer.domElement)

    // Use orthographic camera for full-screen effect
    let frustumSize = 1
    this.camera = new THREE.OrthographicCamera(
      frustumSize / -2,
      frustumSize / 2,
      frustumSize / 2,
      frustumSize / -2,
      -1000,
      1000
    )
    this.camera.position.set(0, 0, 2)

    // For displacement
    this.baseTexture = new THREE.WebGLRenderTarget(
      this.width, this.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat
    }
    )

    this.prevMousePos = new THREE.Vector2(0, 0)
    this.currentWave = 0

    this.time = 0

    this.fps()
    this.setupSettings()
    this.addObjects()
    this.setInitialResolution()
    this.mouseEvents()
    this.resize()
    this.render()
  }

  fps() {
    this.stats = new Stats()
    this.stats.showPanel(0)
    document.body.appendChild(this.stats.dom)

    // Hide stats
    setTimeout(() => {
      this.stats.dom.style.display = 'none';
    }, 0);
  }

  mouseEvents() {
    window.addEventListener('mousemove', (e) => {
      // Convert mouse position to normalized coordinates for the shader
      this.mouse.x = (e.clientX / this.width) * 2 - 1;
      this.mouse.y = -(e.clientY / this.height) * 2 + 1;
    })
  }

  setupSettings() {
    this.params = {
      progress: 1,
      distortionAmount: 0.259
    };

    const pane = new Pane({
      title: 'Parameters',
    });

    pane.addBinding(this.params, 'progress', {
      min: 0,
      max: 1,
      step: 0.01,
    });

    pane.addBinding(this.params, 'distortionAmount', {
      min: 0,
      max: 1,
      step: 0.001,
    });
    // Hide pane
    setTimeout(() => {
      pane.hidden = true;
    }, 0);
  }

  getMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { type: "f", value: 0 },
        uProgress: { type: 'f', value: 1 },
        uResolution: { type: "v4", value: new THREE.Vector4() },
        uDistortionAmount: { type: "f", value: 0.1 },
        uDisplacement: { value: null },
        uTexture: { value: null },
        uMouse: { value: new THREE.Vector2(0, 0) }
      },
    })
  }

  addObjects() {
    this.geometry = new THREE.PlaneGeometry(1, 1, 32, 32)
    this.material = this.getMaterial()
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.secondScene.add(this.mesh)

    // Create a dummy texture for uTexture to avoid errors
    const dummyTexture = new THREE.Texture();
    dummyTexture.needsUpdate = true;
    this.material.uniforms.uTexture.value = dummyTexture;


    this.brushGeometry = new THREE.PlaneGeometry(0.1, 0.1, 32, 32)
    this.max = 100
    this.brushMeshes = []
    for (let i = 0; i < this.max; i++) {
      let m = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load(texture1),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false
      })

      let mesh = new THREE.Mesh(this.brushGeometry, m)
      mesh.visible = false

      mesh.rotation.z = 2 * Math.PI * Math.random()

      this.scene.add(mesh)
      this.brushMeshes.push(mesh)
    }
  }

  setInitialResolution() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight

    // Image aspect ratio handling
    this.videoAspect = 1 / 1;
    let a1, a2
    if (this.height / this.width > this.videoAspect) {
      a1 = (this.width / this.height) * this.videoAspect
      a2 = 1
    } else {
      a1 = 1
      a2 = (this.height / this.width) / this.videoAspect
    }

    // Ensure material exists before setting uniforms
    if (this.material) {
      this.material.uniforms.uResolution.value.x = this.width
      this.material.uniforms.uResolution.value.y = this.height
      this.material.uniforms.uResolution.value.z = a1
      this.material.uniforms.uResolution.value.w = a2
    }
  }

  handleResize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer.setSize(this.width, this.height)

    // Update render target size
    this.baseTexture.setSize(this.width, this.height);

    // Image aspect ratio handling
    this.videoAspect = 1 / 1;
    let a1, a2
    if (this.height / this.width > this.videoAspect) {
      a1 = (this.width / this.height) * this.videoAspect
      a2 = 1
    } else {
      a1 = 1
      a2 = (this.height / this.width) / this.videoAspect
    }

    this.material.uniforms.uResolution.value.x = this.width
    this.material.uniforms.uResolution.value.y = this.height
    this.material.uniforms.uResolution.value.z = a1
    this.material.uniforms.uResolution.value.w = a2
  }

  resize() {
    window.addEventListener('resize', this.handleResize.bind(this))
  }

  setNewWave(x, y, index) {
    let m = this.brushMeshes[index]
    m.visible = true
    m.position.x = x
    m.position.y = y
    m.scale.x = m.scale.y = 0.2
    m.material.opacity = 0.2 // it was 0.5 
  }

  trackMousePosition() {
    // Convert normalized mouse coordinates to orthographic camera space
    // The camera frustum size is 1, so we need to map our mouse coordinates accordingly
    let x = this.mouse.x * 0.5; // Scale to match the orthographic camera's frustum width
    let y = this.mouse.y * 0.5; // Scale to match the orthographic camera's frustum height
    
    // Small threshold to avoid creating waves when mouse barely moves
    if (Math.abs(x - this.prevMousePos.x) < 0.002 && Math.abs(y - this.prevMousePos.y) < 0.002) {
      // Mouse hasn't moved significantly
    } else {
      this.currentWave = (this.currentWave + 1) % this.max
      this.setNewWave(x, y, this.currentWave)

      this.prevMousePos.x = x
      this.prevMousePos.y = y
    }
  }

  render() {
    this.trackMousePosition()
    this.stats.begin()
    this.time += 0.01

    // Update uniforms
    this.material.uniforms.uTime.value = this.time
    this.material.uniforms.uProgress.value = this.params.progress
    this.material.uniforms.uDistortionAmount.value = this.params.distortionAmount
    
    // Pass mouse position to the shader
    this.material.uniforms.uMouse.value.x = this.mouse.x * 0.5;
    this.material.uniforms.uMouse.value.y = this.mouse.y * 0.5;

    window.requestAnimationFrame(this.render.bind(this))
    this.stats.end()

    // First render the brush meshes to the displacement texture
    this.renderer.setRenderTarget(this.baseTexture)
    this.renderer.render(this.scene, this.camera)

    // Use that texture as displacement in the main scene
    this.material.uniforms.uDisplacement.value = this.baseTexture.texture

    // Render the main scene
    this.renderer.setRenderTarget(null)
    this.renderer.clear()
    this.renderer.render(this.secondScene, this.camera)

    // Update brush meshes
    this.brushMeshes.forEach(mesh => {
      if (mesh.visible) {
        mesh.rotation.z += 0.02
        mesh.material.opacity *= 0.96
        mesh.scale.x = 0.982 * mesh.scale.x + 0.108
        mesh.scale.y = mesh.scale.x
        if (mesh.material.opacity < 0.002) {
          mesh.visible = false
        }
      }
    })
  }
}

new Sketch({ dom: document.querySelector('#container') })