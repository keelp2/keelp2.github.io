// ============================================================ SKY
const skyMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, sunDir: { value: new V3(0, 1, 0) }, sunColor: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vP;
    void main(){ vec3 d = normalize(vP); float h = clamp(d.y*1.4+0.12,0.0,1.0); vec3 c = mix(bottom, top, pow(h,0.65));
    float s = max(dot(d, normalize(sunDir)),0.0); c += sunColor*(pow(s,600.0)*3.0 + pow(s,12.0)*0.25);
    gl_FragColor = vec4(c,1.0);
    #include <colorspace_fragment>
    }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; sky.userData.noAO = true; scene.add(sky);
let stars = null;
function makeStars() {
  const n = 900, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random(), v = rand(0.05, 1); const th = u * Math.PI * 2, r = Math.sqrt(1 - v * v); p[i * 3] = Math.cos(th) * r * 420; p[i * 3 + 1] = v * 420; p[i * 3 + 2] = Math.sin(th) * r * 420; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }));
}

