// 24FI092 長谷川晃巳

import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type PhysicsToy = { mesh: THREE.Mesh; body: CANNON.Body };

class ThreeJSContainer {
    private scene!: THREE.Scene;
    private world!: CANNON.World;
    private renderer!: THREE.WebGLRenderer;
    private camera!: THREE.PerspectiveCamera;
    private readonly clock = new THREE.Clock();
    private readonly physicsToys: PhysicsToy[] = [];
    private readonly roomRadius = 10;
    private readonly keys = new Set<string>();
    private pendulumBody!: CANNON.Body;
    private pendulumString!: THREE.Mesh;
    private readonly pendulumAnchor = new THREE.Vector3();
    private catGroup!: THREE.Group;
    private catBody!: CANNON.Body;
    private mouseGroup!: THREE.Group;
    private mouseBody!: CANNON.Body;
    private animationTime = 0;

    public createRendererDOM = (width: number, height: number, cameraPos: THREE.Vector3) => {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0xf4e8dc);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
        this.camera.position.copy(cameraPos);
        this.camera.lookAt(0, 1.5, 0);

        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 1.4, 0);
        controls.minDistance = 7;
        controls.maxDistance = 28;
        controls.maxPolarAngle = Math.PI / 2.03;

        this.createScene();
        window.addEventListener("resize", this.resizeViewport);
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);

        const render = () => {
            const delta = Math.min(this.clock.getDelta(), 0.05);
            this.animationTime += delta;
            this.updateCatMovement();
            this.updateMouse();
            this.world.step(1 / 60, delta, 3);
            for (const { mesh, body } of this.physicsToys) this.copyTransform(mesh, body);
            this.catGroup.position.x = this.catBody.position.x;
            this.catGroup.position.z = this.catBody.position.z;
            this.updatePendulumString();
            controls.update();
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(render);
        };
        render();

        return this.renderer.domElement;
    };

    private resizeViewport = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    private createScene = () => {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf4e8dc);
        this.scene.fog = new THREE.Fog(0xf4e8dc, 24, 42);

        this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
        this.world.defaultContactMaterial.friction = 0.42;
        this.world.defaultContactMaterial.restitution = 0.35;

        this.addLighting();
        this.addRoom();
        this.addCatHouse();
        this.addCatTower();
        this.addTunnel();
        this.addScratcher();
        this.addPendulumToy();
        this.addCushionAndBowls();
        this.addToys();
        this.addCat();
        this.addMouse();
    };

    private material = (color: number, roughness = 0.78) =>
        new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03 });

    private addMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, position: THREE.Vector3, parent: THREE.Object3D = this.scene) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };

    private addStaticBox = (halfSize: CANNON.Vec3, position: CANNON.Vec3, rotationY = 0) => {
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(halfSize));
        body.position.set(position.x, position.y, position.z);
        body.quaternion.setFromEuler(0, rotationY, 0);
        this.world.addBody(body);
    };

    private addLighting = () => {
        this.scene.add(new THREE.HemisphereLight(0xfff2d7, 0x8f7563, 1.35));
        const ceilingLight = new THREE.PointLight(0xffe0ae, 42, 28, 2);
        ceilingLight.position.set(0, 7.5, 1);
        ceilingLight.castShadow = true;
        ceilingLight.shadow.mapSize.set(1024, 1024);
        this.scene.add(ceilingLight);

        const windowLight = new THREE.DirectionalLight(0xfff7e8, 2.1);
        windowLight.position.set(-7, 10, 6);
        windowLight.castShadow = true;
        windowLight.shadow.mapSize.set(2048, 2048);
        windowLight.shadow.camera.left = -12;
        windowLight.shadow.camera.right = 12;
        windowLight.shadow.camera.top = 12;
        windowLight.shadow.camera.bottom = -12;
        this.scene.add(windowLight);

    };

    private addRoom = () => {
        const floor = this.addMesh(new THREE.CylinderGeometry(this.roomRadius, this.roomRadius, 0.35, 96), this.material(0xc99062), new THREE.Vector3(0, -0.18, 0));
        floor.receiveShadow = true;

        const rug = this.addMesh(new THREE.CircleGeometry(4.1, 64), this.material(0xe6b4a4), new THREE.Vector3(0.4, 0.015, 0.5));
        rug.rotation.x = -Math.PI / 2;

        const wallMaterial = this.material(0xf4d8bd);
        wallMaterial.side = THREE.BackSide;
        const wall = this.addMesh(new THREE.CylinderGeometry(10.05, 10.05, 3.3, 96, 1, true), wallMaterial, new THREE.Vector3(0, 1.65, 0));
        wall.receiveShadow = true;

        const trim = this.addMesh(new THREE.TorusGeometry(9.92, 0.13, 10, 96), this.material(0xffffff), new THREE.Vector3(0, 0.34, 0));
        trim.rotation.x = Math.PI / 2;

        const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);

        // cannon-esに中空円筒の壁がないため、短い箱を円周状に並べる。
        for (let i = 0; i < 48; i++) {
            const angle = (i / 48) * Math.PI * 2;
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(new CANNON.Box(new CANNON.Vec3(0.68, 1.6, 0.16)));
            body.position.set(9.86 * Math.cos(angle), 1.6, 9.86 * Math.sin(angle));
            body.quaternion.setFromEuler(0, -angle, 0);
            this.world.addBody(body);
        }
    };

    private addCatHouse = () => {
        const group = new THREE.Group();
        group.position.set(-5.8, 0, -3.2);
        group.rotation.y = 0.35;
        this.scene.add(group);
        const pink = this.material(0xd88982);
        this.addMesh(new THREE.BoxGeometry(3.15, 2.25, 2.65), pink, new THREE.Vector3(0, 1.18, 0), group);
        const roof = this.addMesh(new THREE.ConeGeometry(2.45, 1.45, 4), this.material(0x9f5e56), new THREE.Vector3(0, 3.02, 0), group);
        roof.rotation.y = Math.PI / 4;
        this.addMesh(new THREE.CircleGeometry(0.72, 32), this.material(0x4c3531), new THREE.Vector3(0, 1.05, 1.331), group);
        this.addMesh(new THREE.BoxGeometry(1.45, 0.72, 0.05), this.material(0x4c3531), new THREE.Vector3(0, 0.66, 1.335), group);
        const mat = this.addMesh(new THREE.BoxGeometry(2.1, 0.1, 1.1), this.material(0xe9c4a1), new THREE.Vector3(0, 0.08, 2.05), group);
        mat.rotation.y = 0;

        // 猫ハウス全体を単純な静止Boxとして扱う。
        this.addStaticBox(new CANNON.Vec3(1.65, 1.75, 1.4), new CANNON.Vec3(-5.8, 1.75, -3.2), 0.35);
    };

    private addCatTower = () => {
        const group = new THREE.Group();
        group.position.set(5.4, 0, -3.7);
        this.scene.add(group);
        const wood = this.material(0xc79a68);
        const carpet = this.material(0xb9a1c9);
        for (const [x, y, h] of [[0, 1.35, 2.7], [1.15, 2.25, 4.5], [-0.9, 1.8, 3.6]] as const) {
            const post = this.addMesh(new THREE.CylinderGeometry(0.22, 0.22, h, 18), this.material(0xb88a59), new THREE.Vector3(x, y, 0), group);
            post.castShadow = true;
        }
        this.addMesh(new THREE.CylinderGeometry(2.05, 2.05, 0.18, 32), wood, new THREE.Vector3(0, 0.1, 0), group);
        this.addMesh(new THREE.CylinderGeometry(1.2, 1.2, 0.18, 32), carpet, new THREE.Vector3(-0.9, 2.05, 0), group);
        this.addMesh(new THREE.CylinderGeometry(1.25, 1.25, 0.18, 32), carpet, new THREE.Vector3(0.65, 3.03, 0), group);
        this.addMesh(new THREE.CylinderGeometry(1.05, 1.05, 0.22, 32), carpet, new THREE.Vector3(1.15, 4.55, 0), group);
        const basket = this.addMesh(new THREE.TorusGeometry(0.78, 0.18, 12, 36), carpet, new THREE.Vector3(1.15, 4.78, 0), group);
        basket.rotation.x = Math.PI / 2;
        this.addMesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), this.material(0x765843), new THREE.Vector3(0.65, 2.33, 0), group);
        this.addMesh(new THREE.SphereGeometry(0.22, 18, 12), this.material(0xe9a5ae), new THREE.Vector3(0.65, 1.72, 0), group);

        // 土台と柱をまとめた静止Box。猫がキャットタワーを通り抜けないようにする。
        this.addStaticBox(new CANNON.Vec3(2.05, 2.35, 2.05), new CANNON.Vec3(5.4, 2.35, -3.7));
    };

    private addTunnel = () => {
        const group = new THREE.Group();
        group.position.set(4.6, 0.92, 3.3);
        group.rotation.z = Math.PI / 2;
        this.scene.add(group);
        const tube = this.addMesh(new THREE.CylinderGeometry(1.05, 1.05, 3.4, 40, 1, true), this.material(0x7db5ad), new THREE.Vector3(), group);
        tube.material.side = THREE.DoubleSide;
        for (const y of [-1.62, 0, 1.62]) {
            const ring = this.addMesh(new THREE.TorusGeometry(1.05, 0.09, 10, 40), this.material(0x4f8f88), new THREE.Vector3(0, y, 0), group);
            ring.rotation.x = Math.PI / 2;
        }

        // 横倒しのドラム缶状トンネルを、横長の静止Boxで近似する。
        this.addStaticBox(new CANNON.Vec3(1.75, 1.05, 1.05), new CANNON.Vec3(4.6, 1.05, 3.3));
    };

    private addScratcher = () => {
        const group = new THREE.Group();
        group.position.set(-1.8, 0, -5.7);
        this.scene.add(group);
        this.addMesh(new THREE.BoxGeometry(2.6, 0.22, 1.25), this.material(0x8d654b), new THREE.Vector3(0, 0.12, 0), group);
        this.addMesh(new THREE.BoxGeometry(2.25, 0.18, 0.95), this.material(0xcaa36e), new THREE.Vector3(0, 0.32, 0), group);
        for (let x = -0.95; x <= 0.95; x += 0.19) this.addMesh(new THREE.BoxGeometry(0.055, 0.025, 0.82), this.material(0x9d744f), new THREE.Vector3(x, 0.425, 0), group);
    };

    private addPendulumToy = () => {
        const group = new THREE.Group();
        group.position.set(-6.9, 0, 2.0);
        group.rotation.y = 0.25;
        this.scene.add(group);

        const baseMaterial = this.material(0x76a7a2);
        const woodMaterial = this.material(0xb98557);
        this.addMesh(new THREE.CylinderGeometry(0.82, 0.98, 0.22, 28), baseMaterial, new THREE.Vector3(0, 0.12, 0), group);
        this.addMesh(new THREE.CylinderGeometry(0.1, 0.13, 3.35, 14), woodMaterial, new THREE.Vector3(0, 1.85, 0), group);

        const arm = this.addMesh(new THREE.CylinderGeometry(0.09, 0.09, 1.45, 14), woodMaterial, new THREE.Vector3(0.63, 3.48, 0), group);
        arm.rotation.z = Math.PI / 2;
        this.addMesh(new THREE.SphereGeometry(0.16, 16, 10), baseMaterial, new THREE.Vector3(1.34, 3.48, 0), group);

        // 支点は固定Body、おもちゃは動的Bodyとして距離制約で結ぶ。
        this.pendulumAnchor.set(-5.56, 3.45, 2.0);
        const anchorBody = new CANNON.Body({ mass: 0 });
        anchorBody.position.set(this.pendulumAnchor.x, this.pendulumAnchor.y, this.pendulumAnchor.z);
        this.world.addBody(anchorBody);

        const toy = this.addMesh(new THREE.SphereGeometry(0.3, 20, 14), this.material(0xe58b91), new THREE.Vector3(-7.11, 2.55, 2.0));
        toy.scale.set(1, 1.18, 0.85);
        for (const x of [-0.18, 0, 0.18]) {
            const feather = this.addMesh(new THREE.ConeGeometry(0.09, 0.48, 8), this.material(x === 0 ? 0xf1c76f : 0x9e83bf), new THREE.Vector3(x, -0.43, 0), toy);
            feather.rotation.z = x * 1.8;
        }

        this.pendulumBody = new CANNON.Body({
            mass: 0.45,
            shape: new CANNON.Sphere(0.32),
            linearDamping: 0.015,
            angularDamping: 0.08,
        });
        // 斜め上を初期位置にすることで、重力だけで揺れ始める。
        this.pendulumBody.position.set(-7.11, 2.55, 2.0);
        this.world.addBody(this.pendulumBody);
        this.world.addConstraint(new CANNON.DistanceConstraint(anchorBody, this.pendulumBody, 1.8, 1e6));
        this.physicsToys.push({ mesh: toy, body: this.pendulumBody });

        this.pendulumString = this.addMesh(
            new THREE.CylinderGeometry(0.025, 0.025, 1, 8),
            this.material(0x6d5143),
            this.pendulumAnchor.clone(),
        );
    };

    private updatePendulumString = () => {
        if (!this.pendulumString || !this.pendulumBody) return;
        const bob = new THREE.Vector3(this.pendulumBody.position.x, this.pendulumBody.position.y, this.pendulumBody.position.z);
        const direction = bob.clone().sub(this.pendulumAnchor);
        const length = direction.length();
        this.pendulumString.position.copy(this.pendulumAnchor).add(bob).multiplyScalar(0.5);
        this.pendulumString.scale.set(1, length, 1);
        this.pendulumString.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    };

    private addCushionAndBowls = () => {
        const cushion = this.addMesh(new THREE.SphereGeometry(1.35, 36, 18), this.material(0xe8a6ad), new THREE.Vector3(-4.25, 0.36, 3.85));
        cushion.scale.set(1.35, 0.32, 1);
        const button = this.addMesh(new THREE.SphereGeometry(0.13, 16, 10), this.material(0xc87884), new THREE.Vector3(-4.25, 0.69, 3.85));
        button.scale.y = 0.4;

        for (const [x, color] of [[-0.65, 0x75a6c8], [0.75, 0xe29b67]] as const) {
            const bowl = this.addMesh(new THREE.CylinderGeometry(0.72, 0.52, 0.35, 32, 1, true), this.material(color), new THREE.Vector3(x, 0.2, 6.35));
            bowl.material.side = THREE.DoubleSide;
            this.addMesh(new THREE.CylinderGeometry(0.53, 0.53, 0.05, 32), this.material(x < 0 ? 0x77b9cf : 0x8b5b3e), new THREE.Vector3(x, 0.27, 6.35));
        }
    };

    private addToys = () => {
        this.addPhysicsBall(new THREE.Vector3(2.2, 0.45, 0.8), 0.42, 0xef6b6b);
        this.addPhysicsBall(new THREE.Vector3(-1.7, 0.52, 2.5), 0.5, 0x719bd1);
        this.addPhysicsBall(new THREE.Vector3(2.5, 0.58, 5.4), 0.55, 0xc98ac7);
    };

    private addPhysicsBall = (position: THREE.Vector3, radius: number, color: number) => {
        const mesh = this.addMesh(new THREE.SphereGeometry(radius, 28, 18), this.material(color), position);
        const body = new CANNON.Body({ mass: 0.65, shape: new CANNON.Sphere(radius), linearDamping: 0.18, angularDamping: 0.25 });
        body.position.set(position.x, position.y, position.z);
        this.world.addBody(body);
        const toy = { mesh, body };
        this.physicsToys.push(toy);
        return toy;
    };

    private addCat = () => {
        const cat = new THREE.Group();
        cat.position.set(0.15, 0.05, -1.0);
        cat.rotation.y = -0.55;
        cat.scale.setScalar(0.78);
        this.scene.add(cat);
        const silverFur = this.material(0xb9b8b5);
        const lightFur = this.material(0xe5e3dd);
        const stripeFur = this.material(0x5d5b5a);
        const eyeRim = this.material(0x393534);

        // 参考画像の短い脚と、丸くふっくらした長毛の胴体。
        const body = this.addMesh(new THREE.SphereGeometry(1.08, 32, 20), silverFur, new THREE.Vector3(0, 0.88, -0.18), cat);
        body.scale.set(0.98, 0.76, 1.5);
        const chest = this.addMesh(new THREE.SphereGeometry(0.63, 24, 16), lightFur, new THREE.Vector3(0, 1.03, 0.91), cat);
        chest.scale.set(0.82, 0.98, 0.42);

        const head = this.addMesh(new THREE.SphereGeometry(0.88, 32, 22), silverFur, new THREE.Vector3(0, 2.05, 0.78), cat);
        head.scale.set(1.08, 0.98, 0.92);
        const muzzleLeft = this.addMesh(new THREE.SphereGeometry(0.29, 20, 14), lightFur, new THREE.Vector3(-0.2, 1.88, 1.52), cat);
        muzzleLeft.scale.set(1.15, 0.72, 0.45);
        const muzzleRight = muzzleLeft.clone();
        muzzleRight.position.x = 0.2;
        cat.add(muzzleRight);

        // 外向きに反った耳を、丸い耳本体と小さな耳先で表現。
        for (const x of [-0.58, 0.58]) {
            const ear = this.addMesh(new THREE.SphereGeometry(0.29, 18, 12), silverFur, new THREE.Vector3(x, 2.67, 0.69), cat);
            ear.scale.set(0.85, 1.05, 0.55);
            ear.rotation.z = x < 0 ? -0.35 : 0.35;
            const curledTip = this.addMesh(new THREE.TorusGeometry(0.18, 0.075, 8, 18, Math.PI * 1.35), lightFur, new THREE.Vector3(x * 1.09, 2.82, 0.72), cat);
            curledTip.rotation.set(Math.PI / 2, 0, x < 0 ? 0.55 : -0.55);
        }

        // 大きな青緑色の目。外側に濃い縁を置き、子猫らしい表情にする。
        for (const x of [-0.34, 0.34]) {
            const rim = this.addMesh(new THREE.SphereGeometry(0.18, 20, 14), eyeRim, new THREE.Vector3(x, 2.14, 1.48), cat);
            rim.scale.set(1, 1.08, 0.34);
            const eye = this.addMesh(new THREE.SphereGeometry(0.13, 20, 14), this.material(0x789ca0), new THREE.Vector3(x, 2.14, 1.535), cat);
            eye.scale.set(1, 1.08, 0.28);
            this.addMesh(new THREE.SphereGeometry(0.052, 12, 8), this.material(0x17191a), new THREE.Vector3(x, 2.14, 1.575), cat);
            this.addMesh(new THREE.SphereGeometry(0.022, 8, 6), this.material(0xffffff), new THREE.Vector3(x - 0.035, 2.19, 1.597), cat);
        }

        const nose = this.addMesh(new THREE.ConeGeometry(0.11, 0.13, 3), this.material(0xc98c8d), new THREE.Vector3(0, 1.93, 1.68), cat);
        nose.rotation.x = Math.PI / 2;
        nose.rotation.z = Math.PI;

        // 額と頬の縞模様。
        for (const x of [-0.28, 0, 0.28]) {
            const foreheadStripe = this.addMesh(new THREE.BoxGeometry(0.1, 0.42, 0.045), stripeFur, new THREE.Vector3(x, 2.46, 1.47 - Math.abs(x) * 0.18), cat);
            foreheadStripe.rotation.z = -x * 0.9;
        }
        for (const x of [-0.67, 0.67]) {
            for (let i = 0; i < 2; i++) {
                const cheekStripe = this.addMesh(new THREE.BoxGeometry(0.38, 0.07, 0.045), stripeFur, new THREE.Vector3(x, 2.02 - i * 0.18, 1.39), cat);
                cheekStripe.rotation.z = x < 0 ? -0.18 - i * 0.08 : 0.18 + i * 0.08;
            }
        }

        // 白い足先を持つ短い四肢。
        for (const [x, z] of [[-0.56, 0.78], [0.56, 0.78], [-0.64, -0.82], [0.64, -0.82]] as const) {
            this.addMesh(new THREE.CylinderGeometry(0.22, 0.25, 0.62, 16), silverFur, new THREE.Vector3(x, 0.48, z), cat);
            const paw = this.addMesh(new THREE.SphereGeometry(0.27, 18, 12), lightFur, new THREE.Vector3(x, 0.2, z + 0.09), cat);
            paw.scale.set(1.12, 0.62, 1.35);
        }

        // 重なり合う球を使い、背中から上へ連続するふさふさした尾にする。
        const tailParts = [
            [-0.58, 0.82, -1.35, 0.34],
            [-0.82, 1.12, -1.48, 0.33],
            [-0.93, 1.47, -1.5, 0.31],
            [-0.9, 1.81, -1.45, 0.29],
            [-0.75, 2.1, -1.35, 0.26],
        ] as const;
        for (let i = 0; i < tailParts.length; i++) {
            const [x, y, z, radius] = tailParts[i];
            const tailPart = this.addMesh(new THREE.SphereGeometry(radius, 18, 12), i % 2 === 0 ? stripeFur : silverFur, new THREE.Vector3(x, y, z), cat);
            tailPart.scale.set(1, 1.25, 1);
        }

        this.catGroup = cat;
        this.catBody = new CANNON.Body({
            mass: 2,
            shape: new CANNON.Sphere(0.62),
            linearDamping: 0.2,
        });
        this.catBody.position.set(cat.position.x, 0.62, cat.position.z);
        this.catBody.fixedRotation = true;
        this.catBody.updateMassProperties();
        this.world.addBody(this.catBody);
    };

    private addMouse = () => {
        const mouse = new THREE.Group();
        this.scene.add(mouse);
        const gray = this.material(0x77716d);
        const pink = this.material(0xd99598);
        const body = this.addMesh(new THREE.SphereGeometry(0.28, 18, 12), gray, new THREE.Vector3(), mouse);
        body.scale.set(0.75, 0.72, 1.25);
        this.addMesh(new THREE.SphereGeometry(0.08, 12, 8), pink, new THREE.Vector3(0, 0.01, 0.37), mouse);
        for (const x of [-0.18, 0.18]) this.addMesh(new THREE.SphereGeometry(0.11, 12, 8), pink, new THREE.Vector3(x, 0.19, -0.05), mouse);
        const tail = this.addMesh(new THREE.TorusGeometry(0.38, 0.025, 6, 20, Math.PI * 1.4), pink, new THREE.Vector3(0, 0, -0.48), mouse);
        tail.rotation.x = Math.PI / 2;

        this.mouseGroup = mouse;
        this.mouseBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
        this.mouseBody.addShape(new CANNON.Sphere(0.24));
        this.mouseBody.collisionResponse = true;
        this.world.addBody(this.mouseBody);
        this.updateMouse();
    };

    private onKeyDown = (event: KeyboardEvent) => {
        if (["w", "a", "s", "d"].includes(event.key.toLowerCase())) this.keys.add(event.key.toLowerCase());
    };

    private onKeyUp = (event: KeyboardEvent) => {
        this.keys.delete(event.key.toLowerCase());
    };

    private updateCatMovement = () => {
        const speed = 6.5;
        let x = 0;
        let z = 0;
        if (this.keys.has("w")) z -= 1;
        if (this.keys.has("s")) z += 1;
        if (this.keys.has("a")) x -= 1;
        if (this.keys.has("d")) x += 1;
        const length = Math.hypot(x, z) || 1;
        this.catBody.velocity.x = x / length * speed;
        this.catBody.velocity.z = z / length * speed;
        if (x !== 0 || z !== 0) this.catGroup.rotation.y = Math.atan2(x, z);
    };

    private updateMouse = () => {
        if (!this.mouseGroup || !this.mouseBody) return;
        const radius = 9.35;
        const speed = 0.42;
        const angle = -this.animationTime * speed;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        const velocityX = radius * speed * Math.sin(angle);
        const velocityZ = -radius * speed * Math.cos(angle);
        this.mouseBody.position.set(x, 0.3, z);
        this.mouseBody.velocity.set(velocityX, 0, velocityZ);
        this.mouseGroup.position.set(x, 0.3, z);
        this.mouseGroup.rotation.y = Math.atan2(velocityX, velocityZ);
    };

    private copyTransform = (mesh: THREE.Mesh, body: CANNON.Body) => {
        mesh.position.set(body.position.x, body.position.y, body.position.z);
        mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    };
}

window.addEventListener("DOMContentLoaded", init);

function init() {
    const container = new ThreeJSContainer();
    const viewport = container.createRendererDOM(window.innerWidth, window.innerHeight, new THREE.Vector3(14, 10, 16));
    document.body.appendChild(viewport);
}
