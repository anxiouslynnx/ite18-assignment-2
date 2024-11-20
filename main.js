import * as THREE from 'three';
			import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
			import Stats from 'three/addons/libs/stats.module.js';
			import { InstancedFlow } from 'three/addons/modifiers/CurveModifier.js';
			import { FontLoader } from 'three/addons/loaders/FontLoader.js';
			import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
			import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

			const ACTION_SELECT = 1, ACTION_NONE = 0;
			const mouse = new THREE.Vector2();

			let stats, scene, camera, renderer, rayCaster, flow, action = ACTION_NONE;
			let donut, box;
			let parameters;

			init();

			function init() {
				scene = new THREE.Scene();


				camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000);
				camera.position.set(2, 2, 10);
				camera.lookAt(scene.position);


					const loader = new THREE.TextureLoader();
					loader.load('./textures/aiGalaxy.jpg', function (texture) {
						texture.mapping = THREE.EquirectangularRefractionMapping;
						texture.flipY = false;


						const geometry = new THREE.SphereGeometry(500, 100, 100);
						const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
						const sphere = new THREE.Mesh(geometry, material);

						sphere.rotation.y = Math.PI;
						scene.add(sphere);
					});



				const boxGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
				const boxMaterial = new THREE.MeshBasicMaterial();

				const curves = [
					[
						{ x: 1, y: -0.5, z: -1 },
						{ x: 1, y: -0.5, z: 1 },
						{ x: -1, y: -0.5, z: 1 },
						{ x: -1, y: -0.5, z: -1 },
					],
					[
						{ x: -1, y: 0.5, z: -1 },
						{ x: -1, y: 0.5, z: 1 },
						{ x: 1, y: 0.5, z: 1 },
						{ x: 1, y: 0.5, z: -1 },
					]
				].map(function (curvePoints) {
					const curveVertices = curvePoints.map(function (handlePos) {
						const handle = new THREE.Mesh(boxGeometry, boxMaterial);
						handle.position.copy(handlePos);
						return handle.position;
					});

					const curve = new THREE.CatmullRomCurve3(curveVertices);
					curve.curveType = 'centripetal';
					curve.closed = true;

					return { curve };
				});

				renderer = new THREE.WebGLRenderer({ antialias: true });
				renderer.setPixelRatio(window.devicePixelRatio);
				renderer.setSize(window.innerWidth, window.innerHeight);
				document.body.appendChild(renderer.domElement);

				const controls = new OrbitControls(camera, renderer.domElement);
				controls.enableDamping = true;
				controls.dampingFactor = 0.1;
				controls.screenSpacePanning = false;
				controls.minDistance = 1;
				controls.maxDistance = 10;

				const light = new THREE.DirectionalLight(0xffaa33, 3);
				light.position.set(-10, 10, 10);
				scene.add(light);

				const light2 = new THREE.AmbientLight(0x003973, 3);
				scene.add(light2);


				loader.load('./textures/tyler.jpg', function (texture) {
					texture.flipY = false;
					const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
					const material = new THREE.MeshStandardMaterial({ map: texture });
					box = new THREE.Mesh(geometry, material);
					const numberOfInstances = 10;
					flow = new InstancedFlow(numberOfInstances, curves.length, geometry, material);

					curves.forEach(function ({ curve }, i) {
						flow.updateCurve(i, curve);
						scene.add(flow.object3D);
					});

					for (let i = 0; i < numberOfInstances; i++) {
						const curveIndex = i % curves.length;
						flow.setCurve(i, curveIndex);
						flow.moveIndividualAlongCurve(i, i * 1 / numberOfInstances);
					}

					const donutGeometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
					const donutMaterial = new THREE.MeshStandardMaterial({ map: texture });
					donut = new THREE.Mesh(donutGeometry, donutMaterial);

					donut.position.set(0, 0, 0);
					scene.add(donut);

					setupGUI();

					function animateDonut() {
						donut.rotation.x += 0.01;
						donut.rotation.y += 0.01;
						donut.rotation.z += 0.01;
					}

					const fontLoader = new FontLoader();
					fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
						const textGeometry = new TextGeometry('TYLER, The Creator', {
							font: font,
							size: 1,
							height: 0.1,
						});
						const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
						const textMesh = new THREE.Mesh(textGeometry, textMaterial);

						const boundingBox = new THREE.Box3().setFromObject(textMesh);
						const textWidth = boundingBox.max.x - boundingBox.min.x;

						textMesh.position.set(-textWidth / 2, donut.position.y + 1.5, donut.position.z);

						scene.add(textMesh);
					});

					function tick() {
						if (flow) flow.moveAlongCurve(parameters.speed);
						animateDonut();
						renderer.render(scene, camera);
						requestAnimationFrame(tick);
					}

					tick();
				});

				stats = new Stats();
				document.body.appendChild(stats.dom);

				window.addEventListener('resize', onWindowResize);
			}

			function setupGUI() {
				const gui = new GUI();

				parameters = {
					speed: 0.001,
					wrapTexture: false,
				};

				const settings = {
					mode: 'Texture',
					metallic: 0.5,
					roughness: 0.5,
				};

				const updateMaterials = () => {
					if (settings.mode === 'Texture') {
						box.material.map = box.material.originalMap;
						donut.material.map = donut.material.originalMap;
						box.material.wireframe = false;
						donut.material.wireframe = false;
						box.material.metalness = 0;
						donut.material.metalness = 0;
						box.material.roughness = 0.5;
						donut.material.roughness = 0.5;
					} else if (settings.mode === 'Wireframe') {
						box.material.map = null;
						donut.material.map = null;
						box.material.wireframe = true;
						donut.material.wireframe = true;
					} else if (settings.mode === 'Metallic') {
						box.material.map = null;
						donut.material.map = null;
						box.material.wireframe = false;
						donut.material.wireframe = false;
						box.material.metalness = settings.metallic;
						donut.material.metalness = settings.metallic;
					} else if (settings.mode === 'Glossy') {
						box.material.map = null;
						donut.material.map = null;
						box.material.wireframe = false;
						donut.material.wireframe = false;
						box.material.roughness = 1 - settings.roughness;
						donut.material.roughness = 1 - settings.roughness;
					}

					box.material.needsUpdate = true;
					donut.material.needsUpdate = true;
				};


				box.material.originalMap = box.material.map;
				donut.material.originalMap = donut.material.map;

				gui.add(settings, 'mode', ['Texture', 'Wireframe', 'Metallic', 'Glossy'])
					.name('Mode')
					.onChange(updateMaterials);

				gui.add(settings, 'metallic', 0, 1, 0.01)
					.name('Metallic')
					.onChange(() => {
						if (settings.mode === 'Metallic') updateMaterials();
					});

				gui.add(settings, 'roughness', 0, 1, 0.01)
					.name('Glossy')
					.onChange(() => {
						if (settings.mode === 'Glossy') updateMaterials();
					});


				gui.add(parameters, 'speed', 0.0001, 0.030, 0.0001)
					.name('Speed');
			}

			function onWindowResize() {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize(window.innerWidth, window.innerHeight);
			}


