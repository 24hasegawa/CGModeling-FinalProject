// 学籍番号: XXXXXXX
// 氏名: 山田 太郎

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

class ThreeJSContainer {
    private scene!: THREE.Scene;
    private light!: THREE.Light;

    constructor() {

    }

    // 画面部分の作成(表示する枠ごとに)*
    public createRendererDOM = (width: number, height: number, cameraPos: THREE.Vector3) => {
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
        renderer.setClearColor(new THREE.Color(0x495ed));
        renderer.shadowMap.enabled = true;

        //カメラの設定
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.copy(cameraPos);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        const orbitControls = new OrbitControls(camera, renderer.domElement);

        this.createScene();
        
        const render: FrameRequestCallback = (_time) => {
            orbitControls.update();
            renderer.render(this.scene, camera);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);

        renderer.domElement.style.cssFloat = "left";
        renderer.domElement.style.margin = "10px";
        return renderer.domElement;
    }

    // シーンの作成(全体で1回)
    private createScene = () => {
        this.scene = new THREE.Scene();

        // メッシュの生成 (3つの円錐で軸を表現)
        const geometry = new THREE.ConeGeometry(0.25, 1);
        const redMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
        const greenMaterial = new THREE.MeshPhongMaterial({ color: 0x00FF00 });
        const blueMaterial =  new THREE.MeshPhongMaterial({ color: 0x0000FF });
        const redCone = new THREE.Mesh(geometry, redMaterial);
        const greenCone = new THREE.Mesh(geometry, greenMaterial);
        const blueCone = new THREE.Mesh(geometry, blueMaterial);

        // モデルの座標移動・回転
        redCone.translateX(0.5);
        redCone.rotateZ(-Math.PI / 2);
        greenCone.translateY(0.5);
        blueCone.translateZ(0.5);
        blueCone.rotateX(Math.PI / 2);

        // グループにして一つのオブジェクトとして扱う
        const obj : THREE.Group = new THREE.Group();
        obj.add(redCone);
        obj.add(greenCone);
        obj.add(blueCone);
        this.scene.add(obj);

        // グリッド表示
        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);  

        // 軸表示
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // --- エルミート曲線の数式実装 ---
        const hermite = (p0: THREE.Vector3, v0: THREE.Vector3, 
                         p1: THREE.Vector3, v1: THREE.Vector3, t: number) : (THREE.Vector3) => {
            // 講義資料の定義式に基づく重み係数の計算
            const h0 = 2 * Math.pow(t, 3) - 3 * Math.pow(t, 2) + 1;
            const h1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
            const h2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
            const h3 = Math.pow(t, 3) - Math.pow(t, 2);

            // 各成分ごとの計算
            const result = new THREE.Vector3(
                h0 * p0.x + h1 * v0.x + h2 * p1.x + h3 * v1.x,
                h0 * p0.y + h1 * v0.y + h2 * p1.y + h3 * v1.y,
                h0 * p0.z + h1 * v0.z + h2 * p1.z + h3 * v1.z
            );
            return result;   
        }

        // ライトの設定
        this.light = new THREE.DirectionalLight(0xffffff);
        const lvec = new THREE.Vector3(1, 1, 1).normalize();
        this.light.position.set(lvec.x, lvec.y, lvec.z);
        this.scene.add(this.light);
    
        const timer = new THREE.Timer();
        let t = 0;       // パラメータt (0.0 ～ 1.0)
        let seg = 0;     // 現在のセグメントインデックス (0 ～ 3)

        // 指定された5つの通過点 P0 ～ P4
        const points: THREE.Vector3[] = [
            new THREE.Vector3(0, 0, -4),  // P0
            new THREE.Vector3(0, 0, 2),   // P1
            new THREE.Vector3(2, 0, 2),   // P2
            new THREE.Vector3(0, 2, 0),   // P3
            new THREE.Vector3(-4, 2, 0)   // P4
        ];

        // 各点における速度ベクトル (C1連続性を満たすため、各点につき1つのベクトルを用意)
        // ※値は滑らかに動くよう調整しています
        const velocities: THREE.Vector3[] = [
            new THREE.Vector3(0, 0, 6),   // V0 (P0での速度)
            new THREE.Vector3(2, 0, 2),   // V1 (P1での速度)
            new THREE.Vector3(0, 2, -2),  // V2 (P2での速度)
            new THREE.Vector3(-4, 0, 0),  // V3 (P3での速度)
            new THREE.Vector3(-2, -2, 0)  // V4 (P4での速度)
        ];

        const update: FrameRequestCallback = (_time) => {
            timer.update();

            // 1秒で1セグメント進む設定
            t += timer.getDelta();
            if (t > 1.0) {
                t -= 1.0;
                seg++; // 次のセグメントへ
                if (seg >= 4) { // 全4セグメントが終わったら最初に戻る
                    seg = 0;
                }
            }
            
            // 現在のセグメントに応じた始点・終点とその速度ベクトルを取得
            const p0 = points[seg];
            const v0 = velocities[seg];
            const p1 = points[seg + 1];
            const v1 = velocities[seg + 1];

            // エルミート曲線による座標計算と適用
            const pos = hermite(p0, v0, p1, v1, t);
            obj.position.copy(pos);

            requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }
}

window.addEventListener("DOMContentLoaded", init);

function init() {
    const container = new ThreeJSContainer();
    const viewport = container.createRendererDOM(640, 480, new THREE.Vector3(5, 7, 5));
    document.body.appendChild(viewport);
}